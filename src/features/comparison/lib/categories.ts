import type { PlayerStatistic } from "@/types";

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

export const COMPARISON_CATEGORIES = [
  "Attack",
  "Creativity",
  "Finishing",
  "Passing",
  "Physical",
  "Defense",
] as const;

export type ComparisonCategory = (typeof COMPARISON_CATEGORIES)[number];

/** Six-dimension scouting profile for head-to-head comparison. */
export function toComparisonProfile(stat: PlayerStatistic): Record<ComparisonCategory, number> {
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
