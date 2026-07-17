import { competitions } from "@/lib/mock-data/competitions";
import { players } from "@/lib/mock-data/players";
import { teamStatistics } from "@/lib/mock-data/team-statistics";
import { teams } from "@/lib/mock-data/teams";
import type { TeamRepository } from "./types";

export const mockTeamRepository: TeamRepository = {
  async findAll(competitionId?: string) {
    const { items } = await this.findDirectory({
      competitionIds: competitionId ? [competitionId] : competitions.map((c) => c.id),
      includeStats: true,
    });
    return items;
  },

  async findDirectory(options) {
    const ids = new Set(options.competitionIds);
    const filtered = teams.filter((t) => ids.has(t.competitionId));
    const take = options.take;
    const skip = options.skip ?? 0;
    const page = take != null ? filtered.slice(skip, skip + take) : filtered.slice(skip);
    return {
      total: filtered.length,
      items: page.map((team) => ({
        ...team,
        competition: competitions.find((c) => c.id === team.competitionId),
        stats:
          options.includeStats === false
            ? undefined
            : teamStatistics.find((s) => s.teamId === team.id),
        squadSize: players.filter((p) => p.teamId === team.id).length,
      })),
    };
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
