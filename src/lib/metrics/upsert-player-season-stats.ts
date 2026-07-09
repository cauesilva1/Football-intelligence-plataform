import type { Prisma, PrismaClient } from "@prisma/client";

export interface PlayerSeasonStatsPayload {
  goals: number;
  assists: number;
  tackles: number;
  interceptions: number;
  passingAccuracy: number;
  minutesPlayed: number;
  matchesPlayed: number;
}

/** Converte rótulos como "2025/26" ou "2025" para ano calendário inteiro. */
export function resolveSeasonYearFromLabel(seasonLabel: string): number {
  const crossYear = seasonLabel.match(/^(\d{4})\/\d{2}$/);
  if (crossYear) return Number(crossYear[1]);

  const calendarYear = seasonLabel.match(/^(\d{4})$/);
  if (calendarYear) return Number(calendarYear[1]);

  return 2025;
}

export async function upsertPlayerSeasonStats(
  prisma: PrismaClient | Prisma.TransactionClient,
  playerId: string,
  season: number,
  payload: PlayerSeasonStatsPayload
): Promise<void> {
  await prisma.playerSeasonStats.upsert({
    where: {
      playerId_season: {
        playerId,
        season,
      },
    },
    create: {
      playerId,
      season,
      goals: payload.goals,
      assists: payload.assists,
      tackles: payload.tackles,
      interceptions: payload.interceptions,
      passingAccuracy: payload.passingAccuracy,
      minutesPlayed: payload.minutesPlayed,
      matchesPlayed: payload.matchesPlayed,
    },
    update: {
      goals: payload.goals,
      assists: payload.assists,
      tackles: payload.tackles,
      interceptions: payload.interceptions,
      passingAccuracy: payload.passingAccuracy,
      minutesPlayed: payload.minutesPlayed,
      matchesPlayed: payload.matchesPlayed,
    },
  });
}

export function europeanCsvToSeasonStatsPayload(statistic: {
  appearances?: number;
  minutesPlayed?: number;
  goals?: number;
  assists?: number;
  passAccuracy?: number;
  tacklesWon?: number;
  interceptions?: number;
}): PlayerSeasonStatsPayload {
  return {
    goals: statistic.goals ?? 0,
    assists: statistic.assists ?? 0,
    tackles: statistic.tacklesWon ?? 0,
    interceptions: statistic.interceptions ?? 0,
    passingAccuracy: statistic.passAccuracy ?? 0,
    minutesPlayed: statistic.minutesPlayed ?? 0,
    matchesPlayed: statistic.appearances ?? 0,
  };
}
