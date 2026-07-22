export const POSITION_GLOSSARY: Record<string, string> = {
  GK: "Goalkeeper",
  CB: "Centre-back",
  LB: "Left-back",
  RB: "Right-back",
  CDM: "Defensive midfielder",
  CM: "Central midfielder",
  CAM: "Attacking midfielder",
  LW: "Left winger",
  RW: "Right winger",
  ST: "Striker",
  FW: "Forward",
  MF: "Midfielder",
  DF: "Defender",
};

export const METRIC_GLOSSARY = {
  xG: "Expected Goals (xG): measures the probability of a shot becoming a goal based on shot quality and historical conversion.",
  xA: "Expected Assists (xA): measures the probability of a pass becoming a direct goal assist.",
  rating:
    "Prototype productivity score (soccer): ≈ 6 + goals/90×0.35 + assists/90×0.25 when minutes ≥ 450. Soft-capped rates; not a commercial provider rating.",
  valueScore:
    "Rating per €1M of estimated market value — higher means stronger performance relative to price (Hidden Gems heuristic).",
} as const;
