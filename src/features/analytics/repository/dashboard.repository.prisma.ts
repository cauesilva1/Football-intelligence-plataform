import { getPrisma } from "@/lib/prisma";
import {
  prismaPlayerRepository,
  playerInclude,
} from "@/features/scouting/repository/player.repository.prisma";
import { prismaTeamRepository } from "@/features/scouting/repository/team.repository.prisma";
import { buildDashboardOverview } from "@/features/analytics/lib/build-dashboard-overview";
import { competitionBelongsToSport, type Sport } from "@/lib/sport";
import type { DashboardRepository } from "@/features/scouting/repository/types";

/** Cap heavy player hydration — rankings use this sample; counts come from DB. */
const DASHBOARD_PLAYER_SAMPLE = 350;

export const prismaDashboardRepository: DashboardRepository = {
  async getOverview(sport: Sport = "SOCCER") {
    const prisma = getPrisma();

    const [totalPlayers, teams, competitions, sampleRecords] = await Promise.all([
      prisma.player.count({ where: { sport } }),
      prismaTeamRepository.findAll(),
      prismaTeamRepository.getCompetitions(),
      prisma.player.findMany({
        where: { sport },
        include: playerInclude,
        orderBy: [{ marketValue: "desc" }],
        take: DASHBOARD_PLAYER_SAMPLE,
      }),
    ]);

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
