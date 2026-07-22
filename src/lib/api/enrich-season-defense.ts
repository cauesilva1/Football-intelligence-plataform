import { getPrisma } from "@/lib/prisma";
import { isDbSource } from "@/lib/data-source";
import { namesLikelyMatch } from "@/lib/sync/data-staleness";
import {
  fetchTeamSeasonPlayerDefense,
  getApiSportsQuotaStatus,
} from "@/lib/api-sports";
import {
  API_FOOTBALL_EUROPEAN_SEASON_YEAR,
  API_FOOTBALL_PLAYER_MEDIA_SEASON,
} from "@/lib/seasons";

export type EnrichSeasonDefenseResult = {
  teamsAttempted: number;
  playersUpdated: number;
  skippedNoMatch: number;
  skippedQuota: number;
  failed: number;
  quota: { used: number; limit: number; date: string };
};

/**
 * Update PlayerSeasonStats.tackles / interceptions from API-Football /players
 * (team + season). Operational stand-in for FBref season tables:
 * both refresh after matchdays (typically next day), not live.
 */
export async function enrichSeasonDefenseFromApiFootball(options?: {
  /** Max clubs to process this run (each club ≈ 1–3 API pages). */
  teamLimit?: number;
  season?: number;
}): Promise<EnrichSeasonDefenseResult> {
  const teamLimit = Math.max(1, Math.min(options?.teamLimit ?? 8, 40));
  // Free tier: /players only accepts ≤ 2024. Paid plans can pass season=2025.
  const season =
    options?.season ??
    (process.env.APISPORTS_ALLOW_CURRENT_SEASON === "1"
      ? API_FOOTBALL_EUROPEAN_SEASON_YEAR
      : API_FOOTBALL_PLAYER_MEDIA_SEASON);
  const empty: EnrichSeasonDefenseResult = {
    teamsAttempted: 0,
    playersUpdated: 0,
    skippedNoMatch: 0,
    skippedQuota: 0,
    failed: 0,
    quota: await getApiSportsQuotaStatus(),
  };

  if (!isDbSource()) return empty;

  const prisma = getPrisma();
  const teams = await prisma.team.findMany({
    where: {
      apiSportsId: { not: null },
      players: { some: { sport: "SOCCER" } },
    },
    select: { id: true, name: true, apiSportsId: true },
    orderBy: { name: "asc" },
    take: teamLimit,
  });

  for (const team of teams) {
    const q = await getApiSportsQuotaStatus();
    if (q.used >= q.limit - 1) {
      empty.skippedQuota += 1;
      break;
    }
    if (team.apiSportsId == null) continue;

    empty.teamsAttempted += 1;
    try {
      const lines = await fetchTeamSeasonPlayerDefense(team.apiSportsId, season);
      if (!lines.length) continue;

      const players = await prisma.player.findMany({
        where: { teamId: team.id, sport: "SOCCER" },
        select: { id: true, fullName: true, knownAs: true, apiSportsId: true },
      });

      for (const line of lines) {
        const player =
          players.find((p) => p.apiSportsId === line.playerId) ??
          players.find(
            (p) =>
              namesLikelyMatch(p.fullName, line.playerName) ||
              namesLikelyMatch(p.knownAs, line.playerName)
          );
        if (!player) {
          empty.skippedNoMatch += 1;
          continue;
        }

        await prisma.playerSeasonStats.upsert({
          where: {
            playerId_season: { playerId: player.id, season },
          },
          create: {
            playerId: player.id,
            season,
            tackles: line.tackles,
            interceptions: line.interceptions,
            minutesPlayed: line.minutes,
            matchesPlayed: 0,
            goals: 0,
            assists: 0,
            passingAccuracy: 0,
          },
          update: {
            tackles: line.tackles,
            interceptions: line.interceptions,
          },
        });

        if (player.apiSportsId == null) {
          await prisma.player.update({
            where: { id: player.id },
            data: { apiSportsId: line.playerId },
          });
        }

        empty.playersUpdated += 1;
      }
    } catch (error) {
      empty.failed += 1;
      console.warn(
        `[season-defense] fail ${team.name}:`,
        error instanceof Error ? error.message : error
      );
    }
  }

  empty.quota = await getApiSportsQuotaStatus();
  return empty;
}
