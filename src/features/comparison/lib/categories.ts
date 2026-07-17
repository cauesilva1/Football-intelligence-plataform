import type { PlayerStatistic } from "@/types";
import type { Sport } from "@/lib/sport";

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

export const AMERICAN_FOOTBALL_COMPARISON_CATEGORIES = [
  "Passing",
  "Rushing",
  "Receiving",
  "Defense",
  "Tackles",
  "Sacks",
] as const;

/** @deprecated Prefer sport-aware helpers */
export const COMPARISON_CATEGORIES = SOCCER_COMPARISON_CATEGORIES;

export type SoccerComparisonCategory = (typeof SOCCER_COMPARISON_CATEGORIES)[number];
export type BasketballComparisonCategory = (typeof BASKETBALL_COMPARISON_CATEGORIES)[number];
export type AmericanFootballComparisonCategory =
  (typeof AMERICAN_FOOTBALL_COMPARISON_CATEGORIES)[number];
export type ComparisonCategory =
  | SoccerComparisonCategory
  | BasketballComparisonCategory
  | AmericanFootballComparisonCategory;

export function comparisonCategoriesFor(
  sport: Sport | PlayerStatistic["sport"]
): readonly ComparisonCategory[] {
  if (sport === "BASKETBALL") return BASKETBALL_COMPARISON_CATEGORIES;
  if (sport === "AMERICAN_FOOTBALL") return AMERICAN_FOOTBALL_COMPARISON_CATEGORIES;
  return SOCCER_COMPARISON_CATEGORIES;
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

function toAmericanFootballProfile(
  stat: PlayerStatistic
): Record<AmericanFootballComparisonCategory, number> {
  const passYds = stat.passingYards ?? 0;
  const rushYds = stat.rushingYards ?? 0;
  const recYds = stat.receivingYards ?? 0;
  const tds = stat.touchdowns ?? stat.goals ?? 0;
  const tackles = stat.tacklesWon ?? 0;
  const sacks = stat.sacks ?? 0;
  const ints = stat.interceptions ?? 0;

  return {
    Passing: clamp((passYds / 4500) * 70 + (stat.passAccuracy / 70) * 30),
    Rushing: clamp((rushYds / 1200) * 80 + (tds / 12) * 20),
    Receiving: clamp((recYds / 1200) * 70 + (stat.assists / 80) * 30),
    Defense: clamp((tackles / 100) * 45 + (sacks / 12) * 35 + (ints / 5) * 20),
    Tackles: clamp((tackles / 120) * 100),
    Sacks: clamp((sacks / 15) * 100),
  };
}

/** Six-dimension scouting profile for head-to-head comparison. */
export function toComparisonProfile(stat: PlayerStatistic): Record<string, number> {
  if (stat.sport === "BASKETBALL") return toBasketballProfile(stat);
  if (stat.sport === "AMERICAN_FOOTBALL") return toAmericanFootballProfile(stat);
  return toSoccerProfile(stat);
}
