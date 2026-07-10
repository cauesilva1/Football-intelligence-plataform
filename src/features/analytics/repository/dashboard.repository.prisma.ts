import { prismaPlayerRepository } from "@/features/scouting/repository/player.repository.prisma";
import { prismaTeamRepository } from "@/features/scouting/repository/team.repository.prisma";
import { buildDashboardOverview } from "@/features/analytics/lib/build-dashboard-overview";
import { isBasketballCompetition, type Sport } from "@/lib/sport";
import type { DashboardRepository } from "@/features/scouting/repository/types";

export const prismaDashboardRepository: DashboardRepository = {
  async getOverview(sport: Sport = "SOCCER") {
    const [players, teams, competitions] = await Promise.all([
      prismaPlayerRepository.getAll(sport),
      prismaTeamRepository.findAll(),
      prismaTeamRepository.getCompetitions(),
    ]);

    const scopedTeams =
      sport === "BASKETBALL"
        ? teams.filter((team) => isBasketballCompetition(team.competition?.name ?? ""))
        : teams.filter((team) => !isBasketballCompetition(team.competition?.name ?? ""));

    const scopedCompetitions =
      sport === "BASKETBALL"
        ? competitions.filter((competition) => isBasketballCompetition(competition.name))
        : competitions.filter((competition) => !isBasketballCompetition(competition.name));

    return buildDashboardOverview(players, scopedTeams, scopedCompetitions, sport);
  },
};
