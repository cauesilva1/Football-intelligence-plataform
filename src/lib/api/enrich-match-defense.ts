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

export type EnrichDefenseOptions = {
  /** Max PlayerMatchStat rows to attempt (each may cost 1–2 API calls). */
  limit?: number;
  /** Substring match on competitionLabel (case-insensitive). */
  competition?: string;
  /** Only rows on/after this ISO date (YYYY-MM-DD). */
  since?: string;
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

  const prisma = getPrisma();
  const sinceDate = options.since ? new Date(`${options.since}T00:00:00.000Z`) : undefined;

  const rows = await prisma.playerMatchStat.findMany({
    where: {
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
    },
    orderBy: { matchDate: "desc" },
    take: limit,
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

  empty.candidates = rows.length;
  if (rows.length === 0) {
    empty.quota = await getApiSportsQuotaStatus();
    return empty;
  }

  /** Cache fixture id + lines per teamApiId+date within this run. */
  const fixtureCache = new Map<
    string,
    { fixtureId: number | null; lines: ApiSportsFixturePlayerLine[] | null }
  >();

  for (const row of rows) {
    const q = await getApiSportsQuotaStatus();
    if (q.used >= q.limit) {
      empty.skippedQuota += 1;
      break;
    }

    const teamApiId = row.player.team?.apiSportsId;
    if (teamApiId == null || !row.matchDate) {
      empty.skippedNoTeamId += 1;
      continue;
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
          continue;
        }
        const lines = await fetchApiSportsFixturePlayers(fixtureId);
        cached = { fixtureId, lines };
        fixtureCache.set(cacheKey, cached);
      } else if (cached.fixtureId == null) {
        empty.skippedNoFixture += 1;
        continue;
      } else if (!cached.lines) {
        cached.lines = await fetchApiSportsFixturePlayers(cached.fixtureId);
      }

      const line = (cached.lines ?? []).find((l) =>
        matchLineToPlayer(l, row.player)
      );
      if (!line) {
        empty.skippedNoPlayerMatch += 1;
        continue;
      }

      // Only fill fields that are still null — never invent; 0 from API is real.
      const tackles = row.tackles ?? line.tackles;
      const interceptions = row.interceptions ?? line.interceptions;

      if (tackles == null && interceptions == null) {
        empty.skippedNoPlayerMatch += 1;
        continue;
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
          ...(row.player.apiSportsId == null
            ? {}
            : {}),
        },
      });

      if (row.player.apiSportsId == null && line.playerId) {
        await prisma.player.update({
          where: { id: row.player.id },
          data: { apiSportsId: line.playerId },
        });
      }

      empty.updated += 1;
    } catch (error) {
      empty.failed += 1;
      console.warn(
        `[enrich-defense] fail ${row.player.knownAs} ${day}:`,
        error instanceof Error ? error.message : error
      );
    }
  }

  empty.quota = await getApiSportsQuotaStatus();
  return empty;
}
