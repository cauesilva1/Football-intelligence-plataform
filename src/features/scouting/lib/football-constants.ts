export const MIN_YARDS_PER_GAME_OPTIONS = [0, 20, 40, 60, 80, 100, 150, 200, 250] as const;
export const MIN_TD_PER_GAME_OPTIONS = [0, 0.3, 0.5, 0.8, 1, 1.5, 2] as const;
export const MIN_SACKS_PER_GAME_OPTIONS = [0, 0.2, 0.4, 0.6, 0.8, 1, 1.5] as const;
/** Cap Hit ceilings for scouting market filters (USD). */
export const MAX_CAP_HIT_OPTIONS = [
  0,
  2_000_000,
  5_000_000,
  8_000_000,
  12_000_000,
  20_000_000,
] as const;
