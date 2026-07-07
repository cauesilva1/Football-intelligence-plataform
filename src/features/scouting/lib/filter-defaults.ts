export type ScoutingRoute = "players" | "scouting";

export const FILTER_DEFAULTS: Record<
  ScoutingRoute,
  { pageSize: number; sortBy: "rating"; sortDir: "desc" }
> = {
  players: { pageSize: 25, sortBy: "rating", sortDir: "desc" },
  scouting: { pageSize: 25, sortBy: "rating", sortDir: "desc" },
};

export function getFilterDefaults(route: ScoutingRoute) {
  return FILTER_DEFAULTS[route];
}
