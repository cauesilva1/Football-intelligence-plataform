import { players, getPlayerById } from "@/lib/mock-data/players";
import { filterAndSortPlayers, paginatePlayers } from "@/features/scouting/lib/filter-players";
import type { PlayerFilters } from "@/types";
import type { Sport } from "@/lib/sport";
import type { PlayerRepository } from "./types";

function filterBySport<T extends { sport?: Sport }>(items: T[], sport: Sport): T[] {
  if (sport === "BASKETBALL") {
    return items.filter((item) => item.sport === "BASKETBALL");
  }
  if (sport === "AMERICAN_FOOTBALL") {
    return items.filter((item) => item.sport === "AMERICAN_FOOTBALL");
  }
  return items.filter(
    (item) => item.sport !== "BASKETBALL" && item.sport !== "AMERICAN_FOOTBALL"
  );
}

export const mockPlayerRepository: PlayerRepository = {
  async findMany(filters) {
    const { page = 1, pageSize = 10, sport = "SOCCER" } = filters;
    const scoped = filterBySport(players, sport);
    const sorted = filterAndSortPlayers(scoped, filters);
    return paginatePlayers(sorted, page, pageSize);
  },

  async findById(id, options) {
    const player = getPlayerById(id);
    if (!player) return null;
    if (!options?.season || options.season === player.selectedSeason) return player;

    const currentSeasonStats =
      player.history.find((row) => row.season === options.season) ?? player.currentSeasonStats;

    return {
      ...player,
      selectedSeason: options.season,
      currentSeasonStats,
    };
  },

  async findLite(sport: Sport = "SOCCER", options?: { take?: number; ensureIds?: string[] }) {
    const take = Math.min(Math.max(options?.take ?? 400, 1), 500);
    const ensureIds = new Set((options?.ensureIds ?? []).filter(Boolean));
    const scoped = filterBySport(players, sport);
    const primary = scoped.slice(0, take);
    const extras = scoped.filter((p) => ensureIds.has(p.id) && !primary.some((x) => x.id === p.id));
    return [...primary, ...extras].map(
      ({ id, fullName, knownAs, position, teamId, teamShortName, teamName }) => ({
        id,
        fullName,
        knownAs,
        position,
        teamId,
        teamShortName,
        teamName,
      })
    );
  },

  async findForComparison(idA, idB) {
    const a = getPlayerById(idA);
    const b = getPlayerById(idB);
    if (!a || !b) return null;
    return [a, b];
  },

  async findSample(sport: Sport = "SOCCER", options) {
    const take = options?.take ?? 350;
    let pool = filterBySport(players, sport);
    if (options?.position) {
      pool = pool.filter((p) => p.position === options.position);
    }
    return pool.slice(0, take);
  },

  async getAll(sport: Sport = "SOCCER") {
    return this.findSample(sport, { take: 800 });
  },
};
