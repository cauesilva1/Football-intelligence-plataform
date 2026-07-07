import { mockPlayerRepository } from "@/features/scouting/repository/player.repository.mock";
import { mockTeamRepository } from "@/features/scouting/repository/team.repository.mock";
import { buildDashboardOverview } from "@/features/analytics/lib/build-dashboard-overview";
import type { DashboardRepository } from "@/features/scouting/repository/types";

export const mockDashboardRepository: DashboardRepository = {
  async getOverview() {
    const [players, teams, competitions] = await Promise.all([
      mockPlayerRepository.getAll(),
      mockTeamRepository.findAll(),
      mockTeamRepository.getCompetitions(),
    ]);

    return buildDashboardOverview(players, teams, competitions);
  },
};
