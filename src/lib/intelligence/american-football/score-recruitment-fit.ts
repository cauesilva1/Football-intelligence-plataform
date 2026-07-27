import {
  footballPositionGroup,
  similarFootballPositionGroup,
} from "@/features/scouting/lib/position-scorecard";
import {
  AMERICAN_FOOTBALL_DIMENSION_KEYS,
  type AmericanFootballDimensionKey,
} from "@/lib/intelligence/american-football/types";
import {
  RECRUITMENT_DISCLAIMER,
  type RecruitmentBrief,
  type RecruitmentCandidate,
  type RecruitmentDataConfidence,
  type RecruitmentFitScore,
} from "@/lib/intelligence/recruitment-types";
import type { IntelligenceProfile, TrajectoryDirection } from "@/lib/intelligence/types";
import { hasReliableFootballSample } from "@/lib/scoring/football-rating";
import type { Player } from "@/types";

const DEFAULT_PRIORITIES: Record<
  string,
  Record<AmericanFootballDimensionKey, number>
> = {
  QB: {
    passing: 0.45,
    rushing: 0.2,
    receiving: 0.05,
    disruption: 0.1,
    tackling: 0.2,
  },
  SKILL: {
    passing: 0.05,
    rushing: 0.3,
    receiving: 0.4,
    disruption: 0.05,
    tackling: 0.2,
  },
  DEFENSE: {
    passing: 0.05,
    rushing: 0.05,
    receiving: 0.05,
    disruption: 0.4,
    tackling: 0.45,
  },
  OL: {
    passing: 0.2,
    rushing: 0.2,
    receiving: 0.2,
    disruption: 0.2,
    tackling: 0.2,
  },
  SPECIALIST: {
    passing: 0.2,
    rushing: 0.2,
    receiving: 0.2,
    disruption: 0.2,
    tackling: 0.2,
  },
};

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

function groupKey(position: string): keyof typeof DEFAULT_PRIORITIES {
  const upper = position.toUpperCase();
  if (upper === "QB" || upper === "SKILL" || upper === "DEFENSE" || upper === "OL" || upper === "SPECIALIST") {
    return upper;
  }
  return footballPositionGroup(position);
}

export function normalizeAmericanFootballRecruitmentPriorities(
  brief: RecruitmentBrief
): Record<string, number> {
  const defaults = DEFAULT_PRIORITIES[groupKey(brief.position)];
  const input = brief.priorities ?? defaults;
  const entries = AMERICAN_FOOTBALL_DIMENSION_KEYS.map((key) => {
    const weight = input[key] ?? defaults[key] ?? 0.2;
    return [key, weight] as const;
  });
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0) || 1;
  return Object.fromEntries(entries.map(([key, weight]) => [key, weight / total]));
}

function trajectoryAdjustment(
  briefTrajectory: TrajectoryDirection | "any" | undefined,
  playerTrajectory: TrajectoryDirection
): number {
  if (!briefTrajectory || briefTrajectory === "any") return 0;
  if (briefTrajectory === playerTrajectory) return 6;
  if (briefTrajectory === "improving" && playerTrajectory === "stable") return 2;
  if (briefTrajectory === "stable" && playerTrajectory === "improving") return 2;
  if (briefTrajectory === "declining" && playerTrajectory === "declining") return 4;
  if (playerTrajectory === "declining" && briefTrajectory === "improving") return -8;
  if (playerTrajectory === "insufficient_data") return -3;
  return -2;
}

function dataConfidence(player: Player, profile: IntelligenceProfile): RecruitmentDataConfidence {
  const avg =
    profile.dimensions.reduce((sum, dimension) => sum + dimension.confidence, 0) /
    Math.max(profile.dimensions.length, 1);
  const reliable = hasReliableFootballSample({
    matchesPlayed: player.currentSeasonStats.appearances,
    minutesPlayed: player.currentSeasonStats.minutesPlayed,
  });
  const group = footballPositionGroup(player.position);
  if (group === "OL") return "LOW";
  if (reliable && avg >= 0.8) return "HIGH";
  if (reliable && avg >= 0.55) return "MEDIUM";
  return "LOW";
}

function allowedPositions(briefPosition: string): string[] {
  const upper = briefPosition.toUpperCase();
  if (upper === "QB") return similarFootballPositionGroup("QB");
  if (upper === "SKILL") return similarFootballPositionGroup("WR");
  if (upper === "DEFENSE") return similarFootballPositionGroup("LB");
  if (upper === "OL") return similarFootballPositionGroup("OL");
  if (upper === "SPECIALIST") return similarFootballPositionGroup("K");
  return similarFootballPositionGroup(briefPosition);
}

function passesBriefFilters(brief: RecruitmentBrief, player: Player): boolean {
  if ((player.sport ?? "AMERICAN_FOOTBALL") !== "AMERICAN_FOOTBALL") return false;
  if (brief.sport !== "AMERICAN_FOOTBALL") return false;

  if (!allowedPositions(brief.position).includes(player.position)) return false;

  if (typeof brief.minAge === "number" && player.age < brief.minAge) return false;
  if (typeof brief.maxAge === "number" && player.age > brief.maxAge) return false;
  if (typeof brief.maxMarketValue === "number" && player.marketValue > brief.maxMarketValue) {
    return false;
  }

  const stats = player.currentSeasonStats;
  const minMinutes = brief.minMinutes ?? 360;
  if (stats.minutesPlayed < minMinutes) return false;
  if (typeof brief.minRating === "number" && stats.rating < brief.minRating) return false;
  if (brief.league && player.league && player.league !== brief.league) return false;

  return true;
}

export function scoreAmericanFootballRecruitmentFit(
  brief: RecruitmentBrief,
  player: Player,
  profile: IntelligenceProfile
): RecruitmentFitScore | null {
  if (!passesBriefFilters(brief, player)) return null;

  const weights = normalizeAmericanFootballRecruitmentPriorities(brief);
  let weightedScore = 0;
  let weightedConfidence = 0;
  const dimensionReasons: { label: string; contribution: number }[] = [];

  for (const dimension of profile.dimensions) {
    const weight = weights[dimension.key] ?? 0;
    const effective = dimension.score * dimension.confidence;
    weightedScore += effective * weight;
    weightedConfidence += dimension.confidence * weight;
    dimensionReasons.push({
      label: dimension.label,
      contribution: effective * weight,
    });
  }

  const baseScore = weightedConfidence > 0 ? weightedScore / weightedConfidence : 0;
  let fitScore = baseScore;

  const roleLabel = profile.role.label;
  if (brief.preferredRoles?.length) {
    const roleMatch = brief.preferredRoles.some(
      (role) => role.toLowerCase() === roleLabel.toLowerCase()
    );
    fitScore += roleMatch ? 8 : -4;
  }

  fitScore += trajectoryAdjustment(brief.trajectory, profile.trajectory.direction);

  if (
    !hasReliableFootballSample({
      matchesPlayed: player.currentSeasonStats.appearances,
      minutesPlayed: player.currentSeasonStats.minutesPlayed,
    })
  ) {
    fitScore -= 12;
  }

  if (footballPositionGroup(player.position) === "OL") {
    fitScore -= 8;
  }

  fitScore = clamp(fitScore);

  const reasons = dimensionReasons
    .sort((a, b) => b.contribution - a.contribution)
    .slice(0, 3)
    .map(({ label, contribution }) => `${label} (${Math.round(contribution)} weighted pts)`);

  if (brief.preferredRoles?.some((role) => role.toLowerCase() === roleLabel.toLowerCase())) {
    reasons.unshift(`Role match: ${roleLabel}`);
  }

  const confidence = dataConfidence(player, profile);
  const limitations = [
    ...profile.limitations,
    `Data confidence: ${confidence}`,
    RECRUITMENT_DISCLAIMER,
  ];

  return {
    playerId: player.id,
    fitScore: Number(fitScore.toFixed(1)),
    reasons,
    limitations,
    matchedRole: roleLabel,
    trajectory: profile.trajectory.direction,
    dataConfidence: confidence,
  };
}

export function toAmericanFootballRecruitmentCandidate(
  player: Player,
  fit: RecruitmentFitScore
): RecruitmentCandidate {
  return {
    ...fit,
    playerName: player.knownAs || player.fullName,
    position: player.position,
    age: player.age,
    rating: player.currentSeasonStats.rating,
    marketValue: player.marketValue,
    teamName: player.teamShortName ?? player.teamName,
  };
}

export function rankAmericanFootballRecruitmentCandidates(
  brief: RecruitmentBrief,
  players: Player[],
  profilesByPlayerId: Map<string, IntelligenceProfile>
): RecruitmentCandidate[] {
  const ranked: RecruitmentCandidate[] = [];

  for (const player of players) {
    const profile = profilesByPlayerId.get(player.id);
    if (!profile) continue;
    const fit = scoreAmericanFootballRecruitmentFit(brief, player, profile);
    if (!fit) continue;
    ranked.push(toAmericanFootballRecruitmentCandidate(player, fit));
  }

  ranked.sort((a, b) => b.fitScore - a.fitScore);
  const limit = brief.limit ?? 25;
  return ranked.slice(0, limit);
}
