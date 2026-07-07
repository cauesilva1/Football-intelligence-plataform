import type { PlayerStatistic } from "@/types";

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

export const COMPARISON_CATEGORIES = [
  "Ataque",
  "Criatividade",
  "Finalização",
  "Passe",
  "Físico",
  "Defesa",
] as const;

export type ComparisonCategory = (typeof COMPARISON_CATEGORIES)[number];

/** Six-dimension scouting profile for head-to-head comparison. */
export function toComparisonProfile(stat: PlayerStatistic): Record<ComparisonCategory, number> {
  const p = stat.per90;
  const xg90 = stat.minutesPlayed > 0 ? (stat.xG / stat.minutesPlayed) * 90 : 0;

  return {
    Ataque: clamp((p.shots / 4) * 40 + (p.goals / 0.65) * 60),
    Criatividade: clamp((p.assists / 0.45) * 50 + (p.keyPasses / 2.8) * 50),
    Finalização: clamp((p.goals / 0.65) * 55 + (xg90 / 0.5) * 45),
    Passe: clamp(stat.passAccuracy),
    Físico: clamp(stat.duelsWonPct),
    Defesa: clamp((p.tackles / 3.5) * 50 + (p.interceptions / 2.5) * 50),
  };
}
