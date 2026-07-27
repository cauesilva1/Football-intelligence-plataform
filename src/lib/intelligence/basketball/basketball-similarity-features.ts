import { basketballPositionGroup } from "@/features/scouting/lib/position-scorecard";
import { toRadarProfile } from "@/lib/normalize";
import type { Player } from "@/types";

export type BasketballSimilarityWeightMap = Record<string, number>;

const BB_GUARD_WEIGHTS: BasketballSimilarityWeightMap = {
  Scoring: 0.25,
  Playmaking: 0.3,
  "3P%": 0.2,
  Defense: 0.15,
  "FG%": 0.1,
};

const BB_WING_WEIGHTS: BasketballSimilarityWeightMap = {
  Scoring: 0.28,
  Rebounding: 0.15,
  "3P%": 0.22,
  Defense: 0.2,
  "FG%": 0.15,
};

const BB_BIG_WEIGHTS: BasketballSimilarityWeightMap = {
  Rebounding: 0.3,
  Defense: 0.25,
  Scoring: 0.2,
  "FG%": 0.15,
  Playmaking: 0.1,
};

const FEATURE_LABELS: Record<string, string> = {
  Scoring: "Scoring profile",
  Playmaking: "Playmaking",
  Rebounding: "Rebounding",
  Defense: "Defensive involvement",
  "FG%": "Field-goal efficiency",
  "3P%": "Three-point profile",
  age: "Age profile",
};

export function basketballSimilarityWeightsForPosition(
  position: string
): BasketballSimilarityWeightMap {
  const group = basketballPositionGroup(position);
  if (group === "GUARD") return BB_GUARD_WEIGHTS;
  if (group === "WING") return BB_WING_WEIGHTS;
  return BB_BIG_WEIGHTS;
}

export function basketballSimilarityFeatureVector(player: Player): Record<string, number> {
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

export function basketballWeightedSimilarity(
  a: Record<string, number>,
  b: Record<string, number>,
  weights: BasketballSimilarityWeightMap
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

/** Top weighted dimensions that explain why two basketball profiles are alike. */
export function explainBasketballSimilarity(
  target: Player,
  candidate: Player,
  limit = 3
): string[] {
  const weights = basketballSimilarityWeightsForPosition(target.position);
  const targetVector = basketballSimilarityFeatureVector(target);
  const candidateVector = basketballSimilarityFeatureVector(candidate);
  const why: string[] = [];

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

  why.push(
    ...ranked.slice(0, limit).map(({ key, closeness }) => {
      const label = FEATURE_LABELS[key] ?? key;
      const pct = Math.round(closeness * 100);
      return `${label} (${pct}% aligned)`;
    })
  );

  const targetLeague = (target.league ?? "").trim();
  const candidateLeague = (candidate.league ?? "").trim();
  if (
    targetLeague &&
    candidateLeague &&
    targetLeague.toLowerCase() !== candidateLeague.toLowerCase()
  ) {
    why.push(`Different competition context (${targetLeague} vs ${candidateLeague})`);
  }

  return why.slice(0, limit + 1);
}
