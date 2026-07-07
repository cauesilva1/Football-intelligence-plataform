import { competitions } from "@/lib/mock-data/competitions";
import { players } from "@/lib/mock-data/players";
import { teamStatistics } from "@/lib/mock-data/team-statistics";
import { teams } from "@/lib/mock-data/teams";
import type { TeamRepository } from "./types";

export const mockTeamRepository: TeamRepository = {
  async findAll(competitionId?: string) {
    const filtered = competitionId
      ? teams.filter((t) => t.competitionId === competitionId)
      : teams;
    return filtered.map((team) => ({
      ...team,
      competition: competitions.find((c) => c.id === team.competitionId),
      stats: teamStatistics.find((s) => s.teamId === team.id),
      squadSize: players.filter((p) => p.teamId === team.id).length,
    }));
  },

  async findById(id) {
    const team = teams.find((t) => t.id === id);
    if (!team) return null;
    return {
      ...team,
      competition: competitions.find((c) => c.id === team.competitionId),
      stats: teamStatistics.find((s) => s.teamId === team.id),
      squad: players.filter((p) => p.teamId === team.id),
    };
  },

  async getCompetitions() {
    return competitions;
  },
};
