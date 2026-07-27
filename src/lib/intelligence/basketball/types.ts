export type BasketballDimensionKey =
  | "scoring"
  | "shooting"
  | "playmaking"
  | "defense"
  | "rebounding";

export const BASKETBALL_DIMENSION_KEYS: BasketballDimensionKey[] = [
  "scoring",
  "shooting",
  "playmaking",
  "defense",
  "rebounding",
];

export const BASKETBALL_DIMENSION_LABELS: Record<BasketballDimensionKey, string> = {
  scoring: "Scoring",
  shooting: "Shooting",
  playmaking: "Playmaking",
  defense: "Defense",
  rebounding: "Rebounding",
};
