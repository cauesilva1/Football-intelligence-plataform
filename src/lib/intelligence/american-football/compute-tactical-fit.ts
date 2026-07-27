import type { AmericanFootballTeamStyleProfile } from "@/lib/intelligence/american-football/team-style-profile";
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

function styleWeights(
  style: AmericanFootballTeamStyleProfile
): Record<string, number> {
  switch (style.archetype) {
    case "explosive_offense":
      return {
        passing: 0.3,
        rushing: 0.25,
        receiving: 0.25,
        disruption: 0.1,
        tackling: 0.1,
      };
    case "stout_defense":
      return {
        disruption: 0.35,
        tackling: 0.35,
        passing: 0.1,
        rushing: 0.1,
        receiving: 0.1,
      };
    case "grind":
      return {
        tackling: 0.3,
        disruption: 0.25,
        rushing: 0.2,
        receiving: 0.15,
        passing: 0.1,
      };
    default:
      return {
        passing: 0.2,
        rushing: 0.2,
        receiving: 0.2,
        disruption: 0.2,
        tackling: 0.2,
      };
  }
}

const LABEL_BY_KEY: Record<string, string> = {
  passing: "Passing",
  rushing: "Rushing",
  receiving: "Receiving",
  disruption: "Disruption",
  tackling: "Tackling",
};

/** Match AF intelligence dimensions to a team style profile (0–100). */
export function computeAmericanFootballTacticalFit(
  profile: IntelligenceProfile,
  teamStyle: AmericanFootballTeamStyleProfile,
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
    "Pass/run scheme split is not in the feed — style uses PF/PA and W-L proxies only.",
  ];
  if (profile.trajectory.direction === "insufficient_data") {
    limitations.push("Player trajectory sample is thin — fit may shift with more seasons.");
  }
  if (profile.role.label === "Offensive Lineman") {
    limitations.push("OL fit is weakly evidenced without blocking grades.");
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
