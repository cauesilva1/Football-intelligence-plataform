export const POSITIONS = ["GK", "CB", "LB", "RB", "CDM", "CM", "CAM", "LW", "RW", "ST"] as const;

export const LEAGUES = [
  { id: "comp-01", name: "Premier League" },
  { id: "comp-02", name: "La Liga" },
  { id: "comp-03", name: "Serie A" },
  { id: "comp-04", name: "Bundesliga" },
  { id: "comp-05", name: "Ligue 1" },
  { id: "comp-06", name: "Brasileirão Série A" },
  { id: "comp-07", name: "MLS" },
] as const;

export const MAX_AGE_OPTIONS = [21, 23, 25, 28, 32] as const;
export const MIN_AGE_OPTIONS = [18, 21, 23, 25] as const;
export const MIN_RATING_OPTIONS = [6, 6.5, 7, 7.5, 8] as const;
export const MIN_MINUTES_OPTIONS = [0, 450, 900, 1200, 1800] as const;
export const MIN_GOALS_PER90_OPTIONS = [0, 0.1, 0.25, 0.5] as const;
export const MIN_XG_PER90_OPTIONS = [0, 0.1, 0.2, 0.35] as const;
