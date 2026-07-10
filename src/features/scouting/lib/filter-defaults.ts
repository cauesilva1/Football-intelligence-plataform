import type { Sport } from "@/lib/sport";

export type ScoutingRoute = "players" | "scouting";

export type FilterDefaults = {
  pageSize: number;
  sortBy: "rating" | "name";
  sortDir: "desc" | "asc";
};

export const FILTER_DEFAULTS: Record<ScoutingRoute, FilterDefaults> = {
  players: { pageSize: 25, sortBy: "name", sortDir: "asc" },
  scouting: { pageSize: 25, sortBy: "rating", sortDir: "desc" },
};

export function getFilterDefaults(route: ScoutingRoute, sport: Sport = "SOCCER"): FilterDefaults {
  const base = FILTER_DEFAULTS[route];
  if (route === "players" && sport === "BASKETBALL") {
    return { ...base, sortBy: "name", sortDir: "asc" };
  }
  return base;
}
