import type { PlayerStatistic } from "@/types";

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

export const SOCCER_COMPARISON_CATEGORIES = [
  "Attack",
  "Creativity",
  "Finishing",
  "Passing",
  "Physical",
  "Defense",
] as const;

export const BASKETBALL_COMPARISON_CATEGORIES = [
  "Scoring",
  "Rebounding",
  "Playmaking",
  "Defense",
  "Shooting",
  "Efficiency",
] as const;

/** @deprecated Prefer sport-aware helpers */
export const COMPARISON_CATEGORIES = SOCCER_COMPARISON_CATEGORIES;

export type SoccerComparisonCategory = (typeof SOCCER_COMPARISON_CATEGORIES)[number];
export type BasketballComparisonCategory = (typeof BASKETBALL_COMPARISON_CATEGORIES)[number];
export type ComparisonCategory = SoccerComparisonCategory | BasketballComparisonCategory;

export function comparisonCategoriesFor(
  sport: PlayerStatistic["sport"]
): readonly ComparisonCategory[] {
  return sport === "BASKETBALL"
    ? BASKETBALL_COMPARISON_CATEGORIES
    : SOCCER_COMPARISON_CATEGORIES;
}

function toSoccerProfile(stat: PlayerStatistic): Record<SoccerComparisonCategory, number> {
  const p = stat.per90;
  const xg90 = stat.minutesPlayed > 0 ? (stat.xG / stat.minutesPlayed) * 90 : 0;

  return {
    Attack: clamp((p.shots / 4) * 40 + (p.goals / 0.65) * 60),
    Creativity: clamp((p.assists / 0.45) * 50 + (p.keyPasses / 2.8) * 50),
    Finishing: clamp((p.goals / 0.65) * 55 + (xg90 / 0.5) * 45),
    Passing: clamp(stat.passAccuracy),
    Physical: clamp(stat.duelsWonPct),
    Defense: clamp((p.tackles / 3.5) * 50 + (p.interceptions / 2.5) * 50),
  };
}

function toBasketballProfile(
  stat: PlayerStatistic
): Record<BasketballComparisonCategory, number> {
  const g = stat.perGame ?? {
    points: stat.points ?? 0,
    rebounds: stat.rebounds ?? 0,
    assists: stat.assists ?? 0,
    steals: stat.steals ?? 0,
    blocks: stat.blocks ?? 0,
  };
  const fg = stat.fieldGoalsPercent ?? 0;
  const three = stat.threePointsPercent ?? 0;

  return {
    Scoring: clamp((g.points / 30) * 100),
    Rebounding: clamp((g.rebounds / 12) * 100),
    Playmaking: clamp((g.assists / 10) * 100),
    Defense: clamp((g.steals / 2.5) * 50 + (g.blocks / 2.5) * 50),
    Shooting: clamp(fg * 0.55 + three * 0.45),
    Efficiency: clamp(stat.rating * 10),
  };
}

/** Six-dimension scouting profile for head-to-head comparison. */
export function toComparisonProfile(
  stat: PlayerStatistic
): Record<string, number> {
  if (stat.sport === "BASKETBALL") {
    return toBasketballProfile(stat);
  }
  return toSoccerProfile(stat);
}
