import { teams } from "@/lib/mock-data/teams";
import type { Player, PlayerFilters } from "@/types";

export type FilterPlayersOptions = {
  /** SQL/Prisma already applied search, position, league, team and age/rating/minutes filters */
  prismaPrefiltered?: boolean;
  /** Basquete /players — ignora filtros de métricas já aplicados no Prisma */
  rosterBrowse?: boolean;
};

export function computeXGPer90(minutesPlayed: number, xG: number): number {
  if (!minutesPlayed) return 0;
  return Number(((xG / minutesPlayed) * 90).toFixed(2));
}

export function filterAndSortPlayers(
  all: Player[],
  filters: PlayerFilters,
  options: FilterPlayersOptions = {}
): Player[] {
  const {
    search = "",
    position,
    league,
    teamId,
    minAge,
    maxAge,
    minRating,
    minMinutes,
    minGoalsPer90,
    minXGPer90,
    maxMarketValue,
    maxCapHit,
    sortBy = "rating",
    sortDir = "desc",
  } = filters;

  const { prismaPrefiltered = false } = options;
  let result = [...all];

  if (!prismaPrefiltered) {
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (p) => p.fullName.toLowerCase().includes(q) || p.knownAs.toLowerCase().includes(q)
      );
    }
    if (position) result = result.filter((p) => p.position === position);
    if (teamId) {
      result = result.filter((p) => p.teamId === teamId);
    } else if (league) {
      const teamIds = teams.filter((t) => t.competitionId === league).map((t) => t.id);
      result = result.filter((p) => teamIds.includes(p.teamId));
    }
    if (typeof minAge === "number") result = result.filter((p) => p.age >= minAge);
    if (typeof maxAge === "number") result = result.filter((p) => p.age <= maxAge);
    if (typeof minRating === "number") {
      result = result.filter((p) => p.currentSeasonStats.rating >= minRating);
    }
    if (typeof minMinutes === "number") {
      result = result.filter((p) => p.currentSeasonStats.minutesPlayed >= minMinutes);
    }
  }
  if (typeof minGoalsPer90 === "number") {
    result = result.filter((p) => p.currentSeasonStats.per90.goals >= minGoalsPer90);
  }
  if (typeof minXGPer90 === "number") {
    result = result.filter(
      (p) =>
        computeXGPer90(p.currentSeasonStats.minutesPlayed, p.currentSeasonStats.xG) >= minXGPer90
    );
  }
  if (typeof maxMarketValue === "number") {
    result = result.filter((p) => p.marketValue <= maxMarketValue);
  }
  if (typeof maxCapHit === "number") {
    result = result.filter(
      (p) => typeof p.capHit === "number" && p.capHit > 0 && p.capHit <= maxCapHit
    );
  }

  result.sort((a, b) => {
    const sa = a.currentSeasonStats;
    const sb = b.currentSeasonStats;
    let diff = 0;

    switch (sortBy) {
      case "rating":
        diff = sa.rating - sb.rating;
        break;
      case "goals":
        diff = sa.goals - sb.goals;
        break;
      case "assists":
        diff =
          (sa.assists || sa.perGame?.assists || 0) - (sb.assists || sb.perGame?.assists || 0);
        break;
      case "assistsPer90":
        diff = sa.per90.assists - sb.per90.assists;
        break;
      case "goalsPer90":
        diff = sa.per90.goals - sb.per90.goals;
        break;
      case "xGPer90":
        diff =
          computeXGPer90(sa.minutesPlayed, sa.xG) - computeXGPer90(sb.minutesPlayed, sb.xG);
        break;
      case "points":
        diff =
          (sa.points ?? sa.perGame?.points ?? 0) - (sb.points ?? sb.perGame?.points ?? 0);
        break;
      case "rebounds":
        diff =
          (sa.rebounds ?? sa.perGame?.rebounds ?? 0) - (sb.rebounds ?? sb.perGame?.rebounds ?? 0);
        break;
      case "age":
        diff = a.age - b.age;
        break;
      case "marketValue":
        diff = a.marketValue - b.marketValue;
        break;
      case "name":
        diff = a.fullName.localeCompare(b.fullName);
        break;
      case "position":
        diff = a.position.localeCompare(b.position);
        break;
      case "club":
        diff = (a.teamName ?? a.teamShortName ?? "").localeCompare(b.teamName ?? b.teamShortName ?? "");
        break;
    }

    return sortDir === "asc" ? diff : -diff;
  });

  return result;
}

export function paginatePlayers(
  items: Player[],
  page: number,
  pageSize: number
): { items: Player[]; total: number; page: number; pageSize: number; totalPages: number } {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;

  return {
    items: items.slice(start, start + pageSize),
    total,
    page: safePage,
    pageSize,
    totalPages,
  };
}
