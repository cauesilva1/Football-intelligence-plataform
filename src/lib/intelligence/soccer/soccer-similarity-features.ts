import { toRadarProfile } from "@/lib/normalize";
import { soccerPositionGroup } from "@/features/scouting/lib/position-scorecard";
import type { Player } from "@/types";

export type SoccerSimilarityWeightMap = Record<string, number>;

export const SOCCER_ATTACK_WEIGHTS: SoccerSimilarityWeightMap = {
  Finishing: 0.3,
  Creation: 0.15,
  xG: 0.25,
  shots: 0.15,
  Passing: 0.05,
  Physical: 0.1,
};

export const SOCCER_MID_WEIGHTS: SoccerSimilarityWeightMap = {
  Creation: 0.25,
  Passing: 0.25,
  Finishing: 0.1,
  Defense: 0.15,
  Dribbling: 0.1,
  Physical: 0.15,
};

export const SOCCER_DEF_WEIGHTS: SoccerSimilarityWeightMap = {
  Defense: 0.35,
  Physical: 0.25,
  Passing: 0.2,
  Finishing: 0.05,
  Creation: 0.05,
  Dribbling: 0.1,
};

export const SOCCER_GK_WEIGHTS: SoccerSimilarityWeightMap = {
  Defense: 0.4,
  Passing: 0.25,
  Physical: 0.2,
  Finishing: 0.05,
  Creation: 0.05,
  Dribbling: 0.05,
};

const FEATURE_LABELS: Record<string, string> = {
  Finishing: "Finishing profile",
  Creation: "Chance creation",
  Passing: "Distribution",
  Dribbling: "Ball carrying",
  Defense: "Defensive actions",
  Physical: "Physical duels",
  xG: "Expected goals volume",
  shots: "Shot volume",
  age: "Age profile",
};

export function soccerSimilarityWeightsForPosition(position: string): SoccerSimilarityWeightMap {
  const group = soccerPositionGroup(position);
  if (group === "GK") return SOCCER_GK_WEIGHTS;
  if (group === "ATT") return SOCCER_ATTACK_WEIGHTS;
  if (group === "MID") return SOCCER_MID_WEIGHTS;
  return SOCCER_DEF_WEIGHTS;
}

/** Feature vector for soccer similarity — aligned with scouting similarity weights. */
export function soccerSimilarityFeatureVector(player: Player): Record<string, number> {
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

export function soccerWeightedSimilarity(
  a: Record<string, number>,
  b: Record<string, number>,
  weights: SoccerSimilarityWeightMap
): number {
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

/** Top weighted dimensions that explain why two soccer profiles are alike. */
export function explainSoccerSimilarity(target: Player, candidate: Player, limit = 3): string[] {
  const weights = soccerSimilarityWeightsForPosition(target.position);
  const targetVector = soccerSimilarityFeatureVector(target);
  const candidateVector = soccerSimilarityFeatureVector(candidate);

  const ranked = Object.entries(weights)
    .map(([key, weight]) => {
      const diff = Math.abs((targetVector[key] ?? 0) - (candidateVector[key] ?? 0));
      const closeness = 1 - diff / 100;
      return {
        key,
        weight,
        closeness,
        contribution: closeness * weight,
      };
    })
    .sort((a, b) => b.contribution - a.contribution);

  return ranked.slice(0, limit).map(({ key, closeness }) => {
    const label = FEATURE_LABELS[key] ?? key;
    const pct = Math.round(closeness * 100);
    return `${label} (${pct}% aligned)`;
  });
}
