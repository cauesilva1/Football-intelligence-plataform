import { getPrisma } from "@/lib/prisma";
import {
  prismaPlayerRepository,
  playerListInclude,
} from "@/features/scouting/repository/player.repository.prisma";
import { prismaTeamRepository } from "@/features/scouting/repository/team.repository.prisma";
import { buildDashboardOverview } from "@/features/analytics/lib/build-dashboard-overview";
import { competitionBelongsToSport, type Sport } from "@/lib/sport";
import { CURRENT_SEASON } from "@/lib/seasons";
import { BASKETBALL_SCOUTING_SEASONS } from "@/features/scouting/lib/basketball-constants";
import {
  BB_RATE_MIN_GAMES,
  BB_RATE_MIN_MINUTES,
  AF_RATE_MIN_GAMES,
  AF_RATE_MIN_MINUTES,
  SOCCER_RATE_MIN_MINUTES,
} from "@/lib/scoring";
import type { DashboardRepository } from "@/features/scouting/repository/types";

/** AF calendar seasons stored on PlayerSeasonStats (not ESPN Euro year). */
const AF_DASHBOARD_SEASONS = [2025, 2026, 2024] as const;

/**
 * Cap hydration size — but sample by performance signal, NOT market value.
 * Ordering by marketValue excluded U23 / hidden gems / best performers
 * (high rating, mid-low fee) from the overview lists.
 */
const DASHBOARD_PLAYER_SAMPLE = 500;

async function sampleSoccerPlayerIds(prisma: ReturnType<typeof getPrisma>): Promise<string[]> {
  const rows = await prisma.playerStatistic.findMany({
    where: {
      season: CURRENT_SEASON,
      minutesPlayed: { gte: SOCCER_RATE_MIN_MINUTES },
      player: { sport: "SOCCER" },
    },
    orderBy: [{ rating: "desc" }, { minutesPlayed: "desc" }],
    take: DASHBOARD_PLAYER_SAMPLE,
    select: { playerId: true },
  });
  return [...new Set(rows.map((r) => r.playerId))];
}

async function sampleBasketballPlayerIds(prisma: ReturnType<typeof getPrisma>): Promise<string[]> {
  const rows = await prisma.playerSeasonStats.findMany({
    where: {
      season: { in: [...BASKETBALL_SCOUTING_SEASONS] },
      minutesPlayed: { gte: BB_RATE_MIN_MINUTES },
      matchesPlayed: { gte: BB_RATE_MIN_GAMES },
      points: { gt: 0 },
      player: { sport: "BASKETBALL" },
    },
    orderBy: [{ points: "desc" }, { minutesPlayed: "desc" }],
    take: DASHBOARD_PLAYER_SAMPLE,
    select: { playerId: true },
  });
  return [...new Set(rows.map((r) => r.playerId))];
}

async function sampleFootballPlayerIds(prisma: ReturnType<typeof getPrisma>): Promise<string[]> {
  const rows = await prisma.playerSeasonStats.findMany({
    where: {
      season: { in: [...AF_DASHBOARD_SEASONS] },
      OR: [
        { minutesPlayed: { gte: AF_RATE_MIN_MINUTES } },
        { matchesPlayed: { gte: AF_RATE_MIN_GAMES } },
      ],
      player: { sport: "AMERICAN_FOOTBALL" },
    },
    orderBy: [{ totalYards: "desc" }, { touchdowns: "desc" }, { minutesPlayed: "desc" }],
    take: DASHBOARD_PLAYER_SAMPLE,
    select: { playerId: true },
  });
  return [...new Set(rows.map((r) => r.playerId))];
}

async function samplePlayerIds(
  prisma: ReturnType<typeof getPrisma>,
  sport: Sport
): Promise<string[]> {
  if (sport === "BASKETBALL") return sampleBasketballPlayerIds(prisma);
  if (sport === "AMERICAN_FOOTBALL") return sampleFootballPlayerIds(prisma);
  return sampleSoccerPlayerIds(prisma);
}

export const prismaDashboardRepository: DashboardRepository = {
  async getOverview(sport: Sport = "SOCCER") {
    const prisma = getPrisma();

    const [totalPlayers, teams, competitions, playerIds] = await Promise.all([
      prisma.player.count({ where: { sport } }),
      prismaTeamRepository.findAll(),
      prismaTeamRepository.getCompetitions(),
      samplePlayerIds(prisma, sport),
    ]);

    const sampleRecords =
      playerIds.length > 0
        ? await prisma.player.findMany({
            where: { id: { in: playerIds }, sport },
            include: playerListInclude,
          })
        : [];

    const players = sampleRecords.map((record) =>
      prismaPlayerRepository.mapFromRecord(record)
    );

    const scopedTeams = teams.filter((team) =>
      competitionBelongsToSport(team.competition?.name ?? "", sport)
    );

    const scopedCompetitions = competitions.filter((competition) =>
      competitionBelongsToSport(competition.name, sport)
    );

    const overview = buildDashboardOverview(players, scopedTeams, scopedCompetitions, sport);

    return {
      ...overview,
      totalPlayers,
      totalTeams: scopedTeams.length,
      totalCompetitions: scopedCompetitions.length,
    };
  },
};
