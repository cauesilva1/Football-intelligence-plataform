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
  ratingBasketball:
    "Prototype productivity score (basketball): from PPG/RPG/APG/SPG/BPG when ≥ 10 games and ≥ 200'. Below that sample, rating stays provisional (max 7.0).",
  ratingFootball:
    "Prototype productivity score (American football): role-aware yards/TDs/tackles/sacks when ≥ 6 games and ≥ 360' proxy minutes. Small samples stay provisional (max 7.0).",
  valueScore:
    "Rating per €1M of estimated market value — higher means stronger performance relative to price (Hidden Gems heuristic).",
  capValueScore:
    "Rating per $1M of Cap Hit — higher means stronger performance relative to salary cost (BB/AF bargains heuristic).",
  ppg: "Points per game (season average as stored for basketball).",
  rpg: "Rebounds per game (season average).",
  apg: "Assists per game (season average).",
  yardsPerGame: "Total yards (pass + rush + rec) divided by games played.",
  capHit: "Annual Cap Hit in USD — salary impact against the team salary cap.",
} as const;
