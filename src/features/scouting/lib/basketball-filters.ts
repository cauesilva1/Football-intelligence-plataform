import type { PlayerFilters } from "@/types";

export function hasBasketballStatFilters(filters: PlayerFilters): boolean {
  return (
    typeof filters.minPoints === "number" ||
    typeof filters.minRebounds === "number" ||
    typeof filters.minAssists === "number" ||
    typeof filters.minThreePointsPercent === "number" ||
    typeof filters.minSteals === "number" ||
    typeof filters.minBlocks === "number" ||
    Boolean(filters.archetype)
  );
}

export function applyArchetypeFilters(filters: PlayerFilters): PlayerFilters {
  if (filters.archetype === "three-and-d") {
    return {
      ...filters,
      minThreePointsPercent: Math.max(filters.minThreePointsPercent ?? 0, 38),
      minSteals: Math.max(filters.minSteals ?? 0, 1),
    };
  }

  if (filters.archetype === "rim-protector") {
    return {
      ...filters,
      minBlocks: Math.max(filters.minBlocks ?? 0, 1.5),
      position: filters.position ?? undefined,
    };
  }

  return filters;
}

export function hasActiveBasketballFilters(filters: PlayerFilters): boolean {
  return Boolean(
    filters.search ||
      filters.position ||
      filters.league ||
      filters.teamId ||
      typeof filters.minAge === "number" ||
      typeof filters.maxAge === "number" ||
      filters.archetype ||
      hasBasketballStatFilters(filters)
  );
}
