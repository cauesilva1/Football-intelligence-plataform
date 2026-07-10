import type { PlayerStatistic } from "@/types";

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

/** Radar profile uses per-90 (futebol) ou per-game (basquete) normalizado. */
export function toRadarProfile(stat: PlayerStatistic): Record<string, number> {
  if (stat.sport === "BASKETBALL" && stat.perGame) {
    const g = stat.perGame;
    return {
      Scoring: clamp((g.points / 30) * 100),
      Rebounding: clamp((g.rebounds / 12) * 100),
      Playmaking: clamp((g.assists / 10) * 100),
      Defense: clamp((g.steals / 2.5) * 100 * 0.5 + (g.blocks / 2.5) * 100 * 0.5),
      "FG%": clamp(stat.fieldGoalsPercent ?? 0),
      "3P%": clamp(stat.threePointsPercent ?? 0),
    };
  }

  const p = stat.per90;
  return {
    Finishing: clamp((p.goals / 0.65) * 100),
    Creation: clamp((p.assists / 0.45) * 100 * 0.6 + (p.keyPasses / 2.8) * 100 * 0.4),
    Passing: clamp(stat.passAccuracy),
    Dribbling: clamp((p.dribbles / 4) * 100),
    Defense: clamp((p.tackles / 3.5) * 100 * 0.5 + (p.interceptions / 2.5) * 100 * 0.5),
    Physical: clamp(stat.duelsWonPct),
  };
}
