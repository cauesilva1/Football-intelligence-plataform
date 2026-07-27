import {
  americanFootballSimilarityFeatureVector,
  americanFootballSimilarityWeightsForPosition,
  explainAmericanFootballSimilarity,
} from "@/lib/intelligence/american-football/american-football-similarity-features";
import {
  basketballSimilarityFeatureVector,
  basketballSimilarityWeightsForPosition,
  explainBasketballSimilarity,
} from "@/lib/intelligence/basketball/basketball-similarity-features";
import {
  explainSoccerSimilarity,
  soccerSimilarityFeatureVector,
  soccerSimilarityWeightsForPosition,
  soccerWeightedSimilarity,
} from "@/lib/intelligence/soccer/soccer-similarity-features";
import {
  similarBasketballPositionGroup,
  similarFootballPositionGroup,
  similarPositionGroup,
} from "@/features/scouting/lib/position-scorecard";
import type { Player } from "@/types";

export interface SimilarPlayerResult {
  player: Player;
  score: number;
  why?: string[];
}

type WeightMap = Record<string, number>;

function weightedSimilarity(
  a: Record<string, number>,
  b: Record<string, number>,
  weights: WeightMap
): number {
  return soccerWeightedSimilarity(a, b, weights);
}

function explainWhy(
  sport: string,
  target: Player,
  candidate: Player
): string[] | undefined {
  if (sport === "SOCCER") return explainSoccerSimilarity(target, candidate);
  if (sport === "BASKETBALL") return explainBasketballSimilarity(target, candidate);
  if (sport === "AMERICAN_FOOTBALL") {
    return explainAmericanFootballSimilarity(target, candidate);
  }
  return undefined;
}

/** Weighted similarity — same position group, role-aware weights. */
export function findSimilarPlayers(
  target: Player,
  pool: Player[],
  limit = 4
): SimilarPlayerResult[] {
  const sport = target.sport ?? "SOCCER";
  const isBasketball = sport === "BASKETBALL";
  const isFootball = sport === "AMERICAN_FOOTBALL";

  const weights = isBasketball
    ? basketballSimilarityWeightsForPosition(target.position)
    : isFootball
      ? americanFootballSimilarityWeightsForPosition(target.position)
      : soccerSimilarityWeightsForPosition(target.position);

  const featureFn = isBasketball
    ? basketballSimilarityFeatureVector
    : isFootball
      ? americanFootballSimilarityFeatureVector
      : soccerSimilarityFeatureVector;

  const targetVector = featureFn(target);
  const groupPositions = isBasketball
    ? similarBasketballPositionGroup(target.position)
    : isFootball
      ? similarFootballPositionGroup(target.position)
      : similarPositionGroup(target.position);
  const group = new Set(groupPositions);

  return pool
    .filter((p) => p.id !== target.id && group.has(p.position))
    .map((player) => ({
      player,
      score: weightedSimilarity(targetVector, featureFn(player), weights),
      why: explainWhy(sport, target, player),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
