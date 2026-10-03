import type { Prisma } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";
import { isDbSource } from "@/lib/data-source";
import { namesLikelyMatch } from "@/lib/sync/data-staleness";
import { computeMatchRating } from "@/lib/scoring/soccer-rating";
import {
  fetchApiSportsFixturePlayers,
  findApiSportsFixtureId,
  getApiSportsQuotaStatus,
  type ApiSportsFixturePlayerLine,
} from "@/lib/api-sports";
import type { ApiQuotaTracker } from "@/lib/api-quota";
import {
  buildEnrichmentPlan,
  type EnrichmentPlanEntry,
  type LeagueRunSummary,
} from "@/lib/soccer/enrichment-plan";

const LOG = "[enrich-defense]";
/** Newest pending rows read per league in quota-aware mode (one match ≈ 20–30 rows). */
const PLANNED_ROWS_PER_LEAGUE = 150;
/** A new match costs one fixture lookup plus one fixture-players call. */
const CALLS_PER_NEW_MATCH = 2;

export type EnrichDefenseOptions = {
  /** Max PlayerMatchStat rows to attempt (each may cost 1–2 API calls). Ignored when `quota` is set. */
  limit?: number;
  /** Substring match on competitionLabel (case-insensitive). */
  competition?: string;
  /** Only rows on/after this ISO date (YYYY-MM-DD). */
  since?: string;
  /**
   * Quota-aware mode (cron): leagues in season are served first, the rest rotate daily,
   * and the run stops when fewer than the tracker's minimum calls remain.
   */
  quota?: ApiQuotaTracker;
  now?: Date;
};

export type EnrichDefenseResult = {
  candidates: number;
  updated: number;
  skippedNoTeamId: number;
  skippedNoFixture: number;
  skippedNoPlayerMatch: number;
  skippedQuota: number;
  failed: number;
  quota: { used: number; limit: number; date: string };
  /** Per-league budget and spend (quota-aware mode only). */
  leagues?: LeagueRunSummary[];
  skippedReason?: string;
};

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function matchLineToPlayer(
  line: ApiSportsFixturePlayerLine,
  player: { apiSportsId: number | null; fullName: string; knownAs: string }
): boolean {
  if (player.apiSportsId != null && player.apiSportsId === line.playerId) return true;
  return (
    namesLikelyMatch(player.fullName, line.playerName) ||
    namesLikelyMatch(player.knownAs, line.playerName)
  );
}

/**
 * Fill null/missing defensive fields on existing PlayerMatchStat rows via API-Football.
 * Does not create new appearance rows — ESPN remains the spine.
 */
export async function enrichPlayerMatchDefense(
  options: EnrichDefenseOptions = {}
): Promise<EnrichDefenseResult> {
  const tracker = options.quota;
  const limit = Math.max(1, Math.min(options.limit ?? 40, 100));
  const quota = await getApiSportsQuotaStatus();
  const empty: EnrichDefenseResult = {
    candidates: 0,
    updated: 0,
    skippedNoTeamId: 0,
    skippedNoFixture: 0,
    skippedNoPlayerMatch: 0,
    skippedQuota: 0,
    failed: 0,
    quota,
  };

  if (!isDbSource()) return empty;

  if (tracker && !tracker.canSpend(CALLS_PER_NEW_MATCH)) {
    tracker.recordSkip("defense enrichment: fewer than the minimum API-Football calls remain");
    empty.skippedReason = "low-quota";
    console.warn(
      `${LOG} skipped — API-Football quota low (remaining ${tracker.remaining}, floor ${tracker.minRemaining}).`
    );
    return empty;
  }

  const prisma = getPrisma();
  const sinceDate = options.since ? new Date(`${options.since}T00:00:00.000Z`) : undefined;

  const baseWhere: Prisma.PlayerMatchStatWhereInput = {
    AND: [
      {
        OR: [
          { tackles: null },
          { interceptions: null },
          // Legacy ESPN rows: both zeros usually mean "missing", not a clean sheet of zeros.
          {
            AND: [
              { tackles: 0 },
              { interceptions: 0 },
              { apiSportsFixtureId: null },
              { source: { in: ["espn"] } },
            ],
          },
        ],
      },
      options.competition
        ? {
            competitionLabel: {
              contains: options.competition,
              mode: "insensitive",
            },
          }
        : {},
      sinceDate ? { matchDate: { gte: sinceDate } } : {},
      { matchDate: { not: null } },
    ],
  };

  const loadRows = (extra: Prisma.PlayerMatchStatWhereInput, take: number) =>
    prisma.playerMatchStat.findMany({
      where: { AND: [baseWhere, extra] },
      orderBy: { matchDate: "desc" },
      take,
      include: {
        player: {
          select: {
            id: true,
            fullName: true,
            knownAs: true,
            apiSportsId: true,
            team: { select: { id: true, name: true, apiSportsId: true } },
          },
        },
      },
    });

  type Row = Awaited<ReturnType<typeof loadRows>>[number];

  // Legacy mode: one pass over the newest rows. Quota-aware mode: one lazily loaded bucket per league.
  let plan: EnrichmentPlanEntry[];
  const leagueFilter = new Map<string, Prisma.PlayerMatchStatWhereInput>();
  let legacyRows: Row[] = [];

  if (tracker) {
    const groups = await prisma.playerMatchStat.groupBy({
      by: ["competitionLabel"],
      where: baseWhere,
      _count: { _all: true },
    });
    for (const group of groups) {
      const label = group.competitionLabel?.trim() || "Unknown";
      empty.candidates += group._count._all;
      leagueFilter.set(
        label,
        group.competitionLabel == null
          ? { competitionLabel: null }
          : { competitionLabel: group.competitionLabel }
      );
    }
    plan = buildEnrichmentPlan({
      leagues: [...leagueFilter.keys()],
      now: options.now ?? new Date(),
      usableCalls: tracker.usableCalls(),
    });
    console.log(
      `${LOG} plan — ${plan
        .map((e) => `${e.league}[${e.tier}${e.inSeason ? "" : ",off-season"}]=${e.budget}`)
        .join(" · ") || "no leagues with pending rows"}`
    );
    empty.leagues = [];
  } else {
    legacyRows = await loadRows({}, limit);
    empty.candidates = legacyRows.length;
    plan = [{ league: "all", tier: "core", inSeason: true, budget: Number.POSITIVE_INFINITY }];
  }

  if (empty.candidates === 0) {
    empty.quota = await getApiSportsQuotaStatus();
    return empty;
  }

  /** Cache fixture id + lines per teamApiId+date within this run. */
  const fixtureCache = new Map<
    string,
    { fixtureId: number | null; lines: ApiSportsFixturePlayerLine[] | null }
  >();

  const processRow = async (row: Row): Promise<boolean> => {
    const teamApiId = row.player.team?.apiSportsId;
    if (teamApiId == null || !row.matchDate) {
      empty.skippedNoTeamId += 1;
      return false;
    }

    const day = dateKey(row.matchDate);
    const cacheKey = `${teamApiId}:${day}`;
    let cached = fixtureCache.get(cacheKey);

    try {
      if (!cached) {
        const fixtureId = await findApiSportsFixtureId({ teamApiId, dateIso: day });
        if (fixtureId == null) {
          fixtureCache.set(cacheKey, { fixtureId: null, lines: null });
          empty.skippedNoFixture += 1;
          return false;
        }
        const lines = await fetchApiSportsFixturePlayers(fixtureId);
        cached = { fixtureId, lines };
        fixtureCache.set(cacheKey, cached);
      } else if (cached.fixtureId == null) {
        empty.skippedNoFixture += 1;
        return false;
      } else if (!cached.lines) {
        cached.lines = await fetchApiSportsFixturePlayers(cached.fixtureId);
      }

      const line = (cached.lines ?? []).find((l) => matchLineToPlayer(l, row.player));
      if (!line) {
        empty.skippedNoPlayerMatch += 1;
        return false;
      }

      // Only fill fields that are still null — never invent; 0 from API is real.
      const tackles = row.tackles ?? line.tackles;
      const interceptions = row.interceptions ?? line.interceptions;

      if (tackles == null && interceptions == null) {
        empty.skippedNoPlayerMatch += 1;
        return false;
      }

      const rating = computeMatchRating({
        minutesPlayed: row.minutesPlayed,
        goals: row.goals,
        assists: row.assists,
        tackles: tackles ?? 0,
        interceptions: interceptions ?? 0,
        passesCompleted: row.passesCompleted,
        passesAttempted: row.passesAttempted,
      });

      const nextSource =
        row.source === "espn" || row.source === "espn+api-sports"
          ? "espn+api-sports"
          : row.source.includes("api-sports")
            ? row.source
            : `${row.source}+api-sports`;

      await prisma.playerMatchStat.update({
        where: { id: row.id },
        data: {
          tackles,
          interceptions,
          apiSportsFixtureId: cached.fixtureId,
          source: nextSource,
          rating: rating ?? row.rating,
        },
      });

      if (row.player.apiSportsId == null && line.playerId) {
        await prisma.player.update({
          where: { id: row.player.id },
          data: { apiSportsId: line.playerId },
        });
      }

      empty.updated += 1;
      return true;
    } catch (error) {
      empty.failed += 1;
      console.warn(
        `${LOG} fail ${row.player.knownAs} ${day}:`,
        error instanceof Error ? error.message : error
      );
      return false;
    }
  };

  let carry = 0;
  let stopAll = false;

  for (const entry of plan) {
    if (stopAll) break;
    const bucket = tracker
      ? await loadRows(leagueFilter.get(entry.league) ?? {}, PLANNED_ROWS_PER_LEAGUE)
      : legacyRows;
    const allowance = entry.budget + carry;
    const callsBefore = tracker?.callCount ?? 0;
    let updatedHere = 0;

    for (const row of bucket) {
      const q = await getApiSportsQuotaStatus();
      if (q.used >= q.limit) {
        empty.skippedQuota += 1;
        stopAll = true;
        break;
      }

      if (tracker) {
        if (!tracker.canSpend(CALLS_PER_NEW_MATCH)) {
          tracker.recordSkip("defense enrichment: stopped, fewer than the minimum calls remain");
          empty.skippedQuota += 1;
          stopAll = true;
          break;
        }
        if (tracker.callCount - callsBefore >= allowance) break;
      }

      if (await processRow(row)) updatedHere += 1;
    }

    if (tracker) {
      const spent = tracker.callCount - callsBefore;
      carry = Math.max(0, allowance - spent);
      empty.leagues?.push({
        league: entry.league,
        tier: entry.tier,
        inSeason: entry.inSeason,
        budget: entry.budget,
        spent,
        updated: updatedHere,
      });
    }
  }

  empty.quota = await getApiSportsQuotaStatus();
  return empty;
}
