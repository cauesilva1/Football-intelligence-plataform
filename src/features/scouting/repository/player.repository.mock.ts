import { players, getPlayerById } from "@/lib/mock-data/players";
import { filterAndSortPlayers, paginatePlayers } from "@/features/scouting/lib/filter-players";
import type { PlayerFilters } from "@/types";
import type { PlayerRepository } from "./types";

export const mockPlayerRepository: PlayerRepository = {
  async findMany(filters) {
    const { page = 1, pageSize = 10 } = filters;
    const sorted = filterAndSortPlayers(players, filters);
    return paginatePlayers(sorted, page, pageSize);
  },

  async findById(id) {
    return getPlayerById(id) ?? null;
  },

  async findLite() {
    return players.map(({ id, fullName, knownAs, position, teamId, teamShortName, teamName }) => ({
      id,
      fullName,
      knownAs,
      position,
      teamId,
      teamShortName,
      teamName,
    }));
  },

  async findForComparison(idA, idB) {
    const a = getPlayerById(idA);
    const b = getPlayerById(idB);
    if (!a || !b) return null;
    return [a, b];
  },

  async getAll() {
    return players;
  },
};
