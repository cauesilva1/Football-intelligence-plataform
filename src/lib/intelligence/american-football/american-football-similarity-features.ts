import { footballPositionGroup } from "@/features/scouting/lib/position-scorecard";
import { toRadarProfile } from "@/lib/normalize";
import type { Player } from "@/types";

export type AmericanFootballSimilarityWeightMap = Record<string, number>;

const AF_QB_WEIGHTS: AmericanFootballSimilarityWeightMap = {
  Passing: 0.45,
  Rushing: 0.15,
  Receiving: 0.05,
  Defense: 0.05,
  Efficiency: 0.3,
};

const AF_SKILL_WEIGHTS: AmericanFootballSimilarityWeightMap = {
  Receiving: 0.35,
  Rushing: 0.3,
  Passing: 0.05,
  Defense: 0.1,
  Tackles: 0.05,
  Sacks: 0.05,
};

const AF_DEFENSE_WEIGHTS: AmericanFootballSimilarityWeightMap = {
  Defense: 0.25,
  Tackles: 0.35,
  Sacks: 0.3,
  Passing: 0.05,
  Rushing: 0.05,
};

const AF_SPECIALIST_WEIGHTS: AmericanFootballSimilarityWeightMap = {
  Receiving: 0.2,
  Rushing: 0.2,
  Passing: 0.2,
  Defense: 0.2,
  Tackles: 0.2,
};

const FEATURE_LABELS: Record<string, string> = {
  Passing: "Passing profile",
  Rushing: "Rushing profile",
  Receiving: "Receiving profile",
  Defense: "Coverage / ball skills",
  Tackles: "Tackling volume",
  Sacks: "Pass-rush disruption",
  Efficiency: "Yards efficiency",
  age: "Age profile",
};

export function americanFootballSimilarityWeightsForPosition(
  position: string
): AmericanFootballSimilarityWeightMap {
  const group = footballPositionGroup(position);
  if (group === "QB") return AF_QB_WEIGHTS;
  if (group === "SKILL" || group === "OL") return AF_SKILL_WEIGHTS;
  if (group === "SPECIALIST") return AF_SPECIALIST_WEIGHTS;
  return AF_DEFENSE_WEIGHTS;
}

export function americanFootballSimilarityFeatureVector(
  player: Player
): Record<string, number> {
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

export function americanFootballWeightedSimilarity(
  a: Record<string, number>,
  b: Record<string, number>,
  weights: AmericanFootballSimilarityWeightMap
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

export function explainAmericanFootballSimilarity(
  target: Player,
  candidate: Player,
  limit = 3
): string[] {
  const weights = americanFootballSimilarityWeightsForPosition(target.position);
  const targetVector = americanFootballSimilarityFeatureVector(target);
  const candidateVector = americanFootballSimilarityFeatureVector(candidate);

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

  const why = ranked.slice(0, limit).map(({ key, closeness }) => {
    const label = FEATURE_LABELS[key] ?? key;
    const pct = Math.round(closeness * 100);
    return `${label} (${pct}% aligned)`;
  });

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
