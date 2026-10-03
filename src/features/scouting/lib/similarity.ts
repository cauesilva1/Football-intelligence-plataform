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
  /** False when target or candidate has no games/minutes, so `score` is not a real comparison. */
  comparable: boolean;
  why?: string[];
}

function hasPlayedGames(player: Player): boolean {
  const stats = player.currentSeasonStats;
  return stats.appearances > 0 || stats.minutesPlayed > 0;
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

  const targetPlayed = hasPlayedGames(target);

  return pool
    .filter((p) => p.id !== target.id && group.has(p.position))
    .map((player) => {
      const comparable = targetPlayed && hasPlayedGames(player);
      return {
        player,
        score: comparable ? weightedSimilarity(targetVector, featureFn(player), weights) : 0,
        comparable,
        why: comparable ? explainWhy(sport, target, player) : undefined,
      };
    })
    .sort((a, b) => Number(b.comparable) - Number(a.comparable) || b.score - a.score)
    .slice(0, limit);
}
