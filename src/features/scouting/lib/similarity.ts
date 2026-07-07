import { toRadarProfile } from "@/lib/normalize";
import type { Player } from "@/types";

export interface SimilarPlayerResult {
  player: Player;
  score: number;
}

type WeightMap = Record<string, number>;

const ATTACK_WEIGHTS: WeightMap = {
  Finishing: 0.3,
  Creation: 0.15,
  xG: 0.25,
  shots: 0.15,
  Passing: 0.05,
  Physical: 0.1,
};

const MID_WEIGHTS: WeightMap = {
  Creation: 0.25,
  Passing: 0.25,
  Finishing: 0.1,
  Defense: 0.15,
  Dribbling: 0.1,
  Physical: 0.15,
};

const DEF_WEIGHTS: WeightMap = {
  Defense: 0.35,
  Physical: 0.25,
  Passing: 0.2,
  Finishing: 0.05,
  Creation: 0.05,
  Dribbling: 0.1,
};

const GK_WEIGHTS: WeightMap = {
  Defense: 0.4,
  Passing: 0.25,
  Physical: 0.2,
  Finishing: 0.05,
  Creation: 0.05,
  Dribbling: 0.05,
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
    Finishing: radar.Finishing,
    Creation: radar.Creation,
    Passing: radar.Passing,
    Dribbling: radar.Dribbling,
    Defense: radar.Defense,
    Physical: radar.Physical,
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
