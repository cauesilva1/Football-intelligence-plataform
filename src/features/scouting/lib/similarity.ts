import { toRadarProfile } from "@/lib/normalize";
import {
  similarBasketballPositionGroup,
  similarPositionGroup,
  basketballPositionGroup,
} from "@/features/scouting/lib/position-scorecard";
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

const BB_GUARD_WEIGHTS: WeightMap = {
  Scoring: 0.25,
  Playmaking: 0.3,
  "3P%": 0.2,
  Defense: 0.15,
  "FG%": 0.1,
};

const BB_WING_WEIGHTS: WeightMap = {
  Scoring: 0.28,
  Rebounding: 0.15,
  "3P%": 0.22,
  Defense: 0.2,
  "FG%": 0.15,
};

const BB_BIG_WEIGHTS: WeightMap = {
  Rebounding: 0.3,
  Defense: 0.25,
  Scoring: 0.2,
  "FG%": 0.15,
  Playmaking: 0.1,
};

function soccerWeightsForPosition(position: string): WeightMap {
  if (position === "GK") return GK_WEIGHTS;
  if (["ST", "LW", "RW", "CAM"].includes(position)) return ATTACK_WEIGHTS;
  if (["CM", "CDM"].includes(position)) return MID_WEIGHTS;
  return DEF_WEIGHTS;
}

function basketballWeightsForPosition(position: string): WeightMap {
  const group = basketballPositionGroup(position);
  if (group === "GUARD") return BB_GUARD_WEIGHTS;
  if (group === "WING") return BB_WING_WEIGHTS;
  return BB_BIG_WEIGHTS;
}

function soccerFeatureVector(player: Player): Record<string, number> {
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

function basketballFeatureVector(player: Player): Record<string, number> {
  const radar = toRadarProfile(player.currentSeasonStats);
  return {
    Scoring: radar.Scoring ?? 0,
    Rebounding: radar.Rebounding ?? 0,
    Playmaking: radar.Playmaking ?? 0,
    Defense: radar.Defense ?? 0,
    "FG%": radar["FG%"] ?? 0,
    "3P%": radar["3P%"] ?? 0,
    age: Math.max(0, 100 - Math.abs(player.age - 24) * 6),
  };
}

function weightedSimilarity(
  a: Record<string, number>,
  b: Record<string, number>,
  weights: WeightMap
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

/** Weighted similarity — same position group, role-aware weights. */
export function findSimilarPlayers(
  target: Player,
  pool: Player[],
  limit = 4
): SimilarPlayerResult[] {
  const isBasketball = (target.sport ?? "SOCCER") === "BASKETBALL";
  const weights = isBasketball
    ? basketballWeightsForPosition(target.position)
    : soccerWeightsForPosition(target.position);
  const targetVector = isBasketball
    ? basketballFeatureVector(target)
    : soccerFeatureVector(target);
  const groupPositions = isBasketball
    ? similarBasketballPositionGroup(target.position)
    : similarPositionGroup(target.position);
  const group = new Set(groupPositions);

  return pool
    .filter((p) => p.id !== target.id && group.has(p.position))
    .map((player) => ({
      player,
      score: weightedSimilarity(
        targetVector,
        isBasketball ? basketballFeatureVector(player) : soccerFeatureVector(player),
        weights
      ),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
