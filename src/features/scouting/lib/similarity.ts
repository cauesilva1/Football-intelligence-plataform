import { toRadarProfile } from "@/lib/normalize";
import type { Player } from "@/types";

export interface SimilarPlayerResult {
  player: Player;
  score: number;
}

type WeightMap = Record<string, number>;

const ATTACK_WEIGHTS: WeightMap = {
  Finalização: 0.3,
  Criação: 0.15,
  xG: 0.25,
  shots: 0.15,
  Passe: 0.05,
  Físico: 0.1,
};

const MID_WEIGHTS: WeightMap = {
  Criação: 0.25,
  Passe: 0.25,
  Finalização: 0.1,
  Defesa: 0.15,
  Drible: 0.1,
  Físico: 0.15,
};

const DEF_WEIGHTS: WeightMap = {
  Defesa: 0.35,
  Físico: 0.25,
  Passe: 0.2,
  Finalização: 0.05,
  Criação: 0.05,
  Drible: 0.1,
};

const GK_WEIGHTS: WeightMap = {
  Defesa: 0.4,
  Passe: 0.25,
  Físico: 0.2,
  Finalização: 0.05,
  Criação: 0.05,
  Drible: 0.05,
};

function weightsForPosition(position: string): WeightMap {
  if (position === "GK") return GK_WEIGHTS;
  if (["ST", "LW", "RW", "CAM"].includes(position)) return ATTACK_WEIGHTS;
  if (["CM", "CDM"].includes(position)) return MID_WEIGHTS;
  return DEF_WEIGHTS;
}

function featureVector(player: Player): Record<string, number> {
  const radar = toRadarProfile(player.currentSeasonStats);
  const s = player.currentSeasonStats;
  const minutes = Math.max(s.minutesPlayed, 1);

  return {
    Finalização: radar.Finalização,
    Criação: radar.Criação,
    Passe: radar.Passe,
    Drible: radar.Drible,
    Defesa: radar.Defesa,
    Físico: radar.Físico,
    xG: Math.min(100, (s.xG / minutes) * 90 * 40),
    shots: Math.min(100, (s.shots / minutes) * 90 * 8),
    age: Math.max(0, 100 - Math.abs(player.age - 24) * 6),
  };
}

function weightedSimilarity(a: Record<string, number>, b: Record<string, number>, weights: WeightMap): number {
  let totalWeight = 0;
  let score = 0;

  for (const [key, weight] of Object.entries(weights)) {
    const av = a[key] ?? 0;
    const bv = b[key] ?? 0;
    const diff = Math.abs(av - bv) / 100;
    score += (1 - diff) * weight;
    totalWeight += weight;
  }

  return totalWeight > 0 ? (score / totalWeight) * 100 : 0;
}

/** Weighted similarity v1 — same position group, mock-ready for future pgvector. */
export function findSimilarPlayers(target: Player, pool: Player[], limit = 4): SimilarPlayerResult[] {
  const weights = weightsForPosition(target.position);
  const targetVector = featureVector(target);

  return pool
    .filter((p) => p.id !== target.id && p.position === target.position)
    .map((player) => ({
      player,
      score: weightedSimilarity(targetVector, featureVector(player), weights),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
