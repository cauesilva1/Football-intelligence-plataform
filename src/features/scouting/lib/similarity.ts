import { toRadarProfile } from "@/lib/normalize";
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
  footballPositionGroup,
} from "@/features/scouting/lib/position-scorecard";
import type { Player } from "@/types";

export interface SimilarPlayerResult {
  player: Player;
  score: number;
  why?: string[];
}

type WeightMap = Record<string, number>;

const AF_QB_WEIGHTS: WeightMap = {
  Passing: 0.45,
  Rushing: 0.15,
  Receiving: 0.05,
  Defense: 0.05,
  Efficiency: 0.3,
};

const AF_SKILL_WEIGHTS: WeightMap = {
  Receiving: 0.35,
  Rushing: 0.3,
  Passing: 0.05,
  Defense: 0.1,
  Tackles: 0.05,
  Sacks: 0.05,
};

const AF_DEFENSE_WEIGHTS: WeightMap = {
  Defense: 0.25,
  Tackles: 0.35,
  Sacks: 0.3,
  Passing: 0.05,
  Rushing: 0.05,
};

const AF_SPECIALIST_WEIGHTS: WeightMap = {
  Receiving: 0.2,
  Rushing: 0.2,
  Passing: 0.2,
  Defense: 0.2,
  Tackles: 0.2,
};

function footballWeightsForPosition(position: string): WeightMap {
  const group = footballPositionGroup(position);
  if (group === "QB") return AF_QB_WEIGHTS;
  if (group === "SKILL" || group === "OL") return AF_SKILL_WEIGHTS;
  if (group === "SPECIALIST") return AF_SPECIALIST_WEIGHTS;
  return AF_DEFENSE_WEIGHTS;
}

function footballFeatureVector(player: Player): Record<string, number> {
  const radar = toRadarProfile(player.currentSeasonStats);
  const s = player.currentSeasonStats;
  const games = Math.max(s.appearances, 1);
  const yardsPerGame = (s.totalYards ?? 0) / games;
  return {
    Passing: radar.Passing ?? 0,
    Rushing: radar.Rushing ?? 0,
    Receiving: radar.Receiving ?? 0,
    Defense: radar.Defense ?? 0,
    Tackles: radar.Tackles ?? 0,
    Sacks: radar.Sacks ?? 0,
    Efficiency: Math.min(100, yardsPerGame / 3),
    age: Math.max(0, 100 - Math.abs(player.age - 24) * 6),
  };
}

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
      ? footballWeightsForPosition(target.position)
      : soccerSimilarityWeightsForPosition(target.position);

  const featureFn = isBasketball
    ? basketballSimilarityFeatureVector
    : isFootball
      ? footballFeatureVector
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
