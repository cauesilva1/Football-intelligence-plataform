import type { BasketballTeamStyleProfile } from "@/lib/intelligence/basketball/team-style-profile";
import {
  TACTICAL_FIT_DISCLAIMER,
  type TacticalFitResult,
} from "@/lib/intelligence/tactical-fit-types";
import type { IntelligenceProfile } from "@/lib/intelligence/types";

function dimensionScore(profile: IntelligenceProfile, key: string): number {
  return profile.dimensions.find((dimension) => dimension.key === key)?.score ?? 0;
}

function weightedFit(
  profile: IntelligenceProfile,
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

function styleWeights(style: BasketballTeamStyleProfile): Record<string, number> {
  switch (style.archetype) {
    case "pace_space":
      return {
        scoring: 0.3,
        shooting: 0.25,
        playmaking: 0.25,
        defense: 0.1,
        rebounding: 0.1,
      };
    case "defensive":
      return {
        defense: 0.35,
        rebounding: 0.25,
        scoring: 0.15,
        playmaking: 0.15,
        shooting: 0.1,
      };
    case "grind":
      return {
        defense: 0.3,
        rebounding: 0.25,
        playmaking: 0.2,
        scoring: 0.15,
        shooting: 0.1,
      };
    default:
      return {
        scoring: 0.2,
        shooting: 0.2,
        playmaking: 0.2,
        defense: 0.2,
        rebounding: 0.2,
      };
  }
}

const LABEL_BY_KEY: Record<string, string> = {
  scoring: "Scoring",
  shooting: "Shooting",
  playmaking: "Playmaking",
  defense: "Defense",
  rebounding: "Rebounding",
};

/** Match basketball intelligence dimensions to a team style profile (0–100). */
export function computeBasketballTacticalFit(
  profile: IntelligenceProfile,
  teamStyle: BasketballTeamStyleProfile,
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

  const reasons = [
    `Team style: ${teamStyle.label}`,
    ...ranked.slice(0, 2).map(
      ({ key, score }) =>
        `${LABEL_BY_KEY[key] ?? key} ${score}/100 aligns with squad needs`
    ),
  ];

  const limitations = [
    TACTICAL_FIT_DISCLAIMER,
    "Team style uses standings PPG/ratings proxies — not tracking or lineup context.",
  ];
  if (profile.trajectory.direction === "insufficient_data") {
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
