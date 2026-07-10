import type { PlayerFilters } from "@/types";
import type { Sport } from "@/lib/sport";
import { getFilterDefaults, type ScoutingRoute } from "./filter-defaults";

type SearchParams = Record<string, string | string[] | undefined>;

function param(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function num(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

const SORT_KEYS: PlayerFilters["sortBy"][] = [
  "rating",
  "goals",
  "assists",
  "assistsPer90",
  "goalsPer90",
  "xGPer90",
  "points",
  "rebounds",
  "age",
  "marketValue",
  "name",
  "position",
  "club",
];

const ARCHETYPE_KEYS: NonNullable<PlayerFilters["archetype"]>[] = ["three-and-d", "rim-protector"];

export function parsePlayerFilters(
  searchParams: SearchParams,
  route: ScoutingRoute = "players",
  defaultSport: Sport = "SOCCER"
): PlayerFilters {
  const defaults = getFilterDefaults(route);
  const sortByParam = param(searchParams.sortBy) as PlayerFilters["sortBy"];
  const sortDir = param(searchParams.sortDir) as PlayerFilters["sortDir"];
  const sportParam = param(searchParams.sport);
  const archetypeParam = param(searchParams.archetype) as PlayerFilters["archetype"];

  return {
    sport: sportParam === "BASKETBALL" || sportParam === "SOCCER" ? sportParam : defaultSport,
    search: param(searchParams.search) ?? "",
    position: param(searchParams.position),
    league: param(searchParams.league),
    teamId: param(searchParams.teamId),
    minAge: num(param(searchParams.minAge)),
    maxAge: num(param(searchParams.maxAge)),
    minRating: num(param(searchParams.minRating)),
    minMinutes: num(param(searchParams.minMinutes)),
    minGoalsPer90: num(param(searchParams.minGoalsPer90)),
    minXGPer90: num(param(searchParams.minXGPer90)),
    minPoints: num(param(searchParams.minPoints)),
    minRebounds: num(param(searchParams.minRebounds)),
    minAssists: num(param(searchParams.minAssists)),
    minThreePointsPercent: num(param(searchParams.minThreePointsPercent)),
    minSteals: num(param(searchParams.minSteals)),
    minBlocks: num(param(searchParams.minBlocks)),
    archetype: archetypeParam && ARCHETYPE_KEYS.includes(archetypeParam) ? archetypeParam : undefined,
    route,
    sortBy: sortByParam && SORT_KEYS.includes(sortByParam) ? sortByParam : defaults.sortBy,
    sortDir: sortDir === "asc" || sortDir === "desc" ? sortDir : defaults.sortDir,
    page: num(param(searchParams.page)) ?? 1,
    pageSize: num(param(searchParams.pageSize)) ?? defaults.pageSize,
  };
}

/** @deprecated Use parsePlayerFilters(params, "scouting") */
export function parseScoutingFilters(searchParams: SearchParams): PlayerFilters {
  return parsePlayerFilters(searchParams, "scouting");
}

export function filtersToSearchParams(
  filters: Partial<PlayerFilters>,
  defaults: Partial<PlayerFilters> = { pageSize: 10, sortBy: "rating", sortDir: "desc" }
): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.search) params.set("search", filters.search);
  if (filters.position) params.set("position", filters.position);
  if (filters.league) params.set("league", filters.league);
  if (filters.teamId) params.set("teamId", filters.teamId);
  if (typeof filters.minAge === "number") params.set("minAge", String(filters.minAge));
  if (typeof filters.maxAge === "number") params.set("maxAge", String(filters.maxAge));
  if (typeof filters.minRating === "number") params.set("minRating", String(filters.minRating));
  if (typeof filters.minMinutes === "number") params.set("minMinutes", String(filters.minMinutes));
  if (typeof filters.minGoalsPer90 === "number") params.set("minGoalsPer90", String(filters.minGoalsPer90));
  if (typeof filters.minXGPer90 === "number") params.set("minXGPer90", String(filters.minXGPer90));
  if (typeof filters.minPoints === "number") params.set("minPoints", String(filters.minPoints));
  if (typeof filters.minRebounds === "number") params.set("minRebounds", String(filters.minRebounds));
  if (typeof filters.minAssists === "number") params.set("minAssists", String(filters.minAssists));
  if (typeof filters.minThreePointsPercent === "number") {
    params.set("minThreePointsPercent", String(filters.minThreePointsPercent));
  }
  if (typeof filters.minSteals === "number") params.set("minSteals", String(filters.minSteals));
  if (typeof filters.minBlocks === "number") params.set("minBlocks", String(filters.minBlocks));
  if (filters.archetype) params.set("archetype", filters.archetype);
  if (typeof filters.maxMarketValue === "number") params.set("maxMarketValue", String(filters.maxMarketValue));
  if (filters.sortBy && filters.sortBy !== (defaults.sortBy ?? "rating")) {
    params.set("sortBy", filters.sortBy);
  }
  if (filters.sortDir && filters.sortDir !== (defaults.sortDir ?? "desc")) {
    params.set("sortDir", filters.sortDir);
  }
  if (filters.page && filters.page > 1) params.set("page", String(filters.page));
  if (filters.pageSize && filters.pageSize !== (defaults.pageSize ?? 10)) {
    params.set("pageSize", String(filters.pageSize));
  }

  return params;
}

export function hasActiveFilters(filters: PlayerFilters): boolean {
  return Boolean(
    filters.search ||
      filters.position ||
      filters.league ||
      filters.teamId ||
      typeof filters.minAge === "number" ||
      typeof filters.maxAge === "number" ||
      typeof filters.minRating === "number" ||
      typeof filters.minMinutes === "number" ||
      typeof filters.minGoalsPer90 === "number" ||
      typeof filters.minXGPer90 === "number" ||
      typeof filters.minPoints === "number" ||
      typeof filters.minRebounds === "number" ||
      typeof filters.minAssists === "number" ||
      typeof filters.minThreePointsPercent === "number" ||
      typeof filters.minSteals === "number" ||
      typeof filters.minBlocks === "number" ||
      filters.archetype
  );
}
