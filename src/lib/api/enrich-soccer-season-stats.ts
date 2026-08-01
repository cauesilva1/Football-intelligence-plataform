import { getPrisma } from "@/lib/prisma";
import { isDbSource } from "@/lib/data-source";
import { namesLikelyMatch } from "@/lib/sync/data-staleness";
import {
  fetchTeamSeasonPlayerLines,
  getApiSportsQuotaStatus,
} from "@/lib/api-sports";
import { API_FOOTBALL_PLAYER_MEDIA_SEASON } from "@/lib/seasons";
import { isProductiveSeasonRow } from "@/lib/intelligence/data-depth";

const BIG5_COMPETITION_MATCH = [
  "premier league",
  "la liga",
  "serie a",
  "bundesliga",
  "ligue 1",
  "mls",
  "brasileir",
  "uefa champions",
];

const BIG5_ONLY_MATCH = [
  "premier league",
  "la liga",
  "serie a",
  "bundesliga",
  "ligue 1",
];

export type EnrichSoccerSeasonStatsResult = {
  teamsAttempted: number;
  playersUpserted: number;
  skippedNoMatch: number;
  skippedQuota: number;
  failed: number;
  season: number;
  quota: { used: number; limit: number; date: string };
};

function isShowcaseCompetition(name: string | null | undefined): boolean {
  const n = (name ?? "").toLowerCase();
  return BIG5_COMPETITION_MATCH.some((needle) => n.includes(needle));
}

function isBig5OnlyCompetition(name: string | null | undefined): boolean {
  const n = (name ?? "").toLowerCase();
  if (n.includes("brasileir") || n.includes("mls")) return false;
  return BIG5_ONLY_MATCH.some((needle) => n.includes(needle));
}

/**
 * Upsert full PlayerSeasonStats lines from API-Football `/players?team=&season=`.
 * Default season = 2024 (free-tier max) so showcase rosters gain a real prior productive year
 * alongside current-season ESPN boxscore aggregates.
 */
export async function enrichSoccerSeasonStatsFromApiFootball(options?: {
  teamLimit?: number;
  season?: number;
  /** Prefer Big5 / MLS / Brasileirão clubs first. */
  showcaseOnly?: boolean;
  /** Restrict to European Big5 only (skip MLS / Brasileirão / UCL clubs). */
  big5Only?: boolean;
  /** Skip clubs that already have any PlayerSeasonStats for this season. */
  skipDone?: boolean;
  /** Create unmatched API players (default false — avoids diluting coverage %). */
  createMissingPlayers?: boolean;
  /** Prefer clubs with the most non-productive roster players (surgical refresh). */
  preferZeros?: boolean;
}): Promise<EnrichSoccerSeasonStatsResult> {
  const teamLimit = Math.max(1, Math.min(options?.teamLimit ?? 20, 120));
  const season = options?.season ?? API_FOOTBALL_PLAYER_MEDIA_SEASON;
  const showcaseOnly = options?.showcaseOnly ?? true;
  const big5Only = options?.big5Only ?? false;
  const skipDone = options?.skipDone ?? true;
  const createMissingPlayers = options?.createMissingPlayers ?? false;
  const preferZeros = options?.preferZeros ?? false;

  const empty: EnrichSoccerSeasonStatsResult = {
    teamsAttempted: 0,
    playersUpserted: 0,
    skippedNoMatch: 0,
    skippedQuota: 0,
    failed: 0,
    season,
    quota: await getApiSportsQuotaStatus(),
  };

  if (!isDbSource()) return empty;

  const prisma = getPrisma();
  const teams = await prisma.team.findMany({
    where: {
      apiSportsId: { not: null },
      players: { some: { sport: "SOCCER" } },
      ...(showcaseOnly
        ? {
            OR: [
              { competition: { name: { contains: "Premier", mode: "insensitive" } } },
              { competition: { name: { contains: "La Liga", mode: "insensitive" } } },
              { competition: { name: { equals: "Serie A", mode: "insensitive" } } },
              { competition: { name: { contains: "Bundesliga", mode: "insensitive" } } },
              { competition: { name: { contains: "Ligue", mode: "insensitive" } } },
              { competition: { name: { contains: "MLS", mode: "insensitive" } } },
              { competition: { name: { contains: "Brasileir", mode: "insensitive" } } },
              { competition: { name: { contains: "Champions", mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      name: true,
      apiSportsId: true,
      competition: { select: { name: true } },
    },
    orderBy: { name: "asc" },
  });

  let ordered = showcaseOnly
    ? teams.filter((t) => isShowcaseCompetition(t.competition?.name))
    : teams;

  if (big5Only) {
    ordered = ordered.filter((t) => {
      const n = (t.competition?.name ?? "").toLowerCase();
      if (n.includes("brasileir") || n.includes("mls") || n.includes("champions")) {
        return false;
      }
      return isBig5OnlyCompetition(t.competition?.name);
    });
  }

  if (skipDone) {
    const covered = await prisma.player.groupBy({
      by: ["teamId"],
      where: {
        sport: "SOCCER",
        teamId: { in: ordered.map((t) => t.id) },
        stats: { some: { season } },
      },
      _count: { _all: true },
    });
    const doneTeamIds = new Set(
      covered.map((row) => row.teamId).filter((id): id is string => Boolean(id))
    );
    const pending = ordered.filter((t) => !doneTeamIds.has(t.id));
    ordered = pending.length > 0 ? pending : ordered;
    console.log(
      `[enrich-soccer-season] season=${season} · pending clubs ${pending.length}/${doneTeamIds.size + pending.length}`
    );
  }

  if (preferZeros && ordered.length > 1) {
    const roster = await prisma.player.findMany({
      where: {
        sport: "SOCCER",
        teamId: { in: ordered.map((t) => t.id) },
      },
      select: {
        teamId: true,
        stats: {
          where: { season },
          select: { matchesPlayed: true, minutesPlayed: true },
        },
        statistics: {
          where: { season: String(season) },
          select: { appearances: true, minutesPlayed: true },
        },
      },
    });
    const zeroByTeam = new Map<string, number>();
    for (const player of roster) {
      if (!player.teamId) continue;
      let apps = 0;
      let minutes = 0;
      for (const row of player.stats) {
        apps += row.matchesPlayed;
        minutes += row.minutesPlayed;
      }
      for (const row of player.statistics) {
        apps += row.appearances;
        minutes += row.minutesPlayed;
      }
      if (!isProductiveSeasonRow(apps, minutes, "SOCCER")) {
        zeroByTeam.set(player.teamId, (zeroByTeam.get(player.teamId) ?? 0) + 1);
      }
    }
    ordered = [...ordered].sort(
      (a, b) => (zeroByTeam.get(b.id) ?? 0) - (zeroByTeam.get(a.id) ?? 0)
    );
    console.log(
      `[enrich-soccer-season] prefer-zeros · top ${Math.min(5, ordered.length)}: ` +
        ordered
          .slice(0, 5)
          .map((t) => `${t.name}(${zeroByTeam.get(t.id) ?? 0})`)
          .join(", ")
    );
  }

  ordered = ordered.slice(0, teamLimit);

  for (const team of ordered) {
    const q = await getApiSportsQuotaStatus();
    if (q.used >= q.limit - 2) {
      empty.skippedQuota += 1;
      console.log(`[enrich-soccer-season] quota exhausted at ${q.used}/${q.limit}`);
      break;
    }
    if (team.apiSportsId == null) continue;

    empty.teamsAttempted += 1;
    try {
      console.log(
        `[enrich-soccer-season] ${empty.teamsAttempted}/${ordered.length} ${team.name} (${team.competition?.name})…`
      );
      const lines = await fetchTeamSeasonPlayerLines(team.apiSportsId, season);
      if (!lines.length) {
        console.log(`[enrich-soccer-season] ${team.name}: no lines`);
        continue;
      }

      const players = await prisma.player.findMany({
        where: { teamId: team.id, sport: "SOCCER" },
        select: { id: true, fullName: true, knownAs: true, apiSportsId: true },
      });

      let matched = 0;
      let created = 0;
      for (const line of lines) {
        let player =
          players.find((p) => p.apiSportsId === line.playerId) ??
          players.find(
            (p) =>
              namesLikelyMatch(p.fullName, line.playerName) ||
              namesLikelyMatch(p.knownAs, line.playerName)
          );

        // Same API id elsewhere (transfer / wrong team link).
        if (!player) {
          const byApi = await prisma.player.findFirst({
            where: { sport: "SOCCER", apiSportsId: line.playerId },
            select: { id: true, fullName: true, knownAs: true, apiSportsId: true },
          });
          if (byApi) {
            player = byApi;
            await prisma.player.update({
              where: { id: byApi.id },
              data: {
                teamId: team.id,
                league: team.competition?.name ?? undefined,
              },
            });
          }
        }

        // Opt-in: create missing showcase player so season lines are not dropped.
        if (!player && createMissingPlayers) {
          const createdPlayer = await prisma.player.create({
            data: {
              fullName: line.playerName,
              knownAs: line.playerName,
              dateOfBirth: new Date("2000-01-01T00:00:00.000Z"),
              nationality: "Unknown",
              position: "MID",
              height: 180,
              weight: 75,
              apiSportsId: line.playerId,
              sport: "SOCCER",
              league: team.competition?.name ?? "Unknown",
              teamId: team.id,
              dataSyncedSeason: String(season),
              dataSyncedAt: new Date(),
              strengths: [],
              weaknesses: [],
            },
            select: { id: true, fullName: true, knownAs: true, apiSportsId: true },
          });
          player = createdPlayer;
          players.push(createdPlayer);
          created += 1;
        }

        if (!player) {
          empty.skippedNoMatch += 1;
          continue;
        }

        await prisma.playerSeasonStats.upsert({
          where: { playerId_season: { playerId: player.id, season } },
          create: {
            playerId: player.id,
            season,
            goals: line.goals,
            assists: line.assists,
            tackles: line.tackles,
            interceptions: line.interceptions,
            minutesPlayed: line.minutes,
            matchesPlayed: line.appearances,
            passingAccuracy: line.passingAccuracy,
          },
          update: {
            goals: line.goals,
            assists: line.assists,
            tackles: line.tackles,
            interceptions: line.interceptions,
            minutesPlayed: line.minutes,
            matchesPlayed: line.appearances,
            passingAccuracy: line.passingAccuracy,
          },
        });

        if (player.apiSportsId == null) {
          await prisma.player.update({
            where: { id: player.id },
            data: { apiSportsId: line.playerId },
          });
        }

        empty.playersUpserted += 1;
        matched += 1;
      }
      console.log(
        `[enrich-soccer-season] ${team.name}: matched ${matched}/${lines.length}` +
          (created ? ` · created ${created}` : "")
      );
    } catch (error) {
      empty.failed += 1;
      console.warn(`[enrich-soccer-season] team ${team.name}:`, error);
    }
  }

  empty.quota = await getApiSportsQuotaStatus();
  return empty;
}
