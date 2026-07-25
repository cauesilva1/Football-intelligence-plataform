import type { PlayerFilters } from "@/types";

export function hasFootballStatFilters(filters: PlayerFilters): boolean {
  return (
    typeof filters.minYardsPerGame === "number" ||
    typeof filters.minTouchdownsPerGame === "number" ||
    typeof filters.minSacksPerGame === "number" ||
    typeof filters.maxCapHit === "number"
  );
}

export function hasActiveFootballFilters(filters: PlayerFilters): boolean {
  return Boolean(
    filters.search ||
      filters.position ||
      filters.league ||
      filters.teamId ||
      typeof filters.minAge === "number" ||
      typeof filters.maxAge === "number" ||
      typeof filters.minRating === "number" ||
      typeof filters.minMinutes === "number" ||
      hasFootballStatFilters(filters)
  );
}
