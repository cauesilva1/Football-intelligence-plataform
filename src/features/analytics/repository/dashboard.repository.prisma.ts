import { prismaPlayerRepository } from "@/features/scouting/repository/player.repository.prisma";
import { prismaTeamRepository } from "@/features/scouting/repository/team.repository.prisma";
import { buildDashboardOverview } from "@/features/analytics/lib/build-dashboard-overview";
import type { DashboardRepository } from "@/features/scouting/repository/types";

export const prismaDashboardRepository: DashboardRepository = {
  async getOverview() {
    const [players, teams, competitions] = await Promise.all([
      prismaPlayerRepository.getAll(),
      prismaTeamRepository.findAll(),
      prismaTeamRepository.getCompetitions(),
    ]);

    return buildDashboardOverview(players, teams, competitions);
  },
};
