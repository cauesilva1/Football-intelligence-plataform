import type { PlayerStatistic } from "@/types";

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

/** Radar profile uses per-90 normalized metrics (industry standard). */
export function toRadarProfile(stat: PlayerStatistic): Record<string, number> {
  const p = stat.per90;
  return {
    Finalização: clamp((p.goals / 0.65) * 100),
    Criação: clamp((p.assists / 0.45) * 100 * 0.6 + (p.keyPasses / 2.8) * 100 * 0.4),
    Passe: clamp(stat.passAccuracy),
    Drible: clamp((p.dribbles / 4) * 100),
    Defesa: clamp((p.tackles / 3.5) * 100 * 0.5 + (p.interceptions / 2.5) * 100 * 0.5),
    Físico: clamp(stat.duelsWonPct),
  };
}
