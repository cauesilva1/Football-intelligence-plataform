import type { TeamStyleProfile } from "@/lib/intelligence/soccer/team-style-profile";
import type { PlayerIntelligenceProfile } from "@/lib/intelligence/soccer/types";

export const TACTICAL_FIT_DISCLAIMER =
  "Heuristic squad-style match from season aggregates — not a full tactical model.";

export interface TacticalFitResult {
  teamId: string;
  teamName: string;
  fitScore: number;
  teamStyleLabel: string;
  reasons: string[];
  limitations: string[];
}

function dimensionScore(profile: PlayerIntelligenceProfile, key: string): number {
  return profile.dimensions.find((dimension) => dimension.key === key)?.score ?? 0;
}

function weightedFit(
  profile: PlayerIntelligenceProfile,
  weights: Record<string, number>
): number {
  let total = 0;
  let weightSum = 0;
  for (const [key, weight] of Object.entries(weights)) {
    total += dimensionScore(profile, key) * weight;
    weightSum += weight;
  }
  return weightSum > 0 ? total / weightSum : 0;
}

function styleWeights(style: TeamStyleProfile): Record<string, number> {
  switch (style.archetype) {
    case "possession":
      return {
        ball_progression: 0.35,
        creation: 0.3,
        production: 0.15,
        defense: 0.2,
      };
    case "high_press":
      return {
        defense: 0.4,
        ball_progression: 0.25,
        creation: 0.15,
        production: 0.2,
      };
    case "direct":
      return {
        production: 0.4,
        creation: 0.2,
        ball_progression: 0.15,
        defense: 0.25,
      };
    case "low_block":
      return {
        defense: 0.45,
        production: 0.2,
        ball_progression: 0.15,
        creation: 0.2,
      };
    default:
      return {
        production: 0.25,
        creation: 0.25,
        defense: 0.25,
        ball_progression: 0.25,
      };
  }
}

/** Match player intelligence dimensions to a team style profile (0–100). */
export function computeTacticalFit(
  profile: PlayerIntelligenceProfile,
  teamStyle: TeamStyleProfile,
  teamName: string
): TacticalFitResult {
  const weights = styleWeights(teamStyle);
  const fitScore = Math.round(weightedFit(profile, weights));

  const ranked = Object.entries(weights)
    .map(([key, weight]) => ({
      key,
      weight,
      score: dimensionScore(profile, key),
      contribution: dimensionScore(profile, key) * weight,
    }))
    .sort((a, b) => b.contribution - a.contribution);

  const labelByKey: Record<string, string> = {
    production: "Production",
    creation: "Creation",
    defense: "Defense",
    ball_progression: "Ball progression",
  };

  const reasons = [
    `Team style: ${teamStyle.label}`,
    ...ranked.slice(0, 2).map(
      ({ key, score }) => `${labelByKey[key] ?? key} ${score}/100 aligns with squad needs`
    ),
  ];

  const limitations = [TACTICAL_FIT_DISCLAIMER];
  if (profile.trajectory === "insufficient_data") {
    limitations.push("Player trajectory sample is thin — fit may shift with more seasons.");
  }

  return {
    teamId: teamStyle.teamId,
    teamName,
    fitScore,
    teamStyleLabel: teamStyle.label,
    reasons,
    limitations,
  };
}
