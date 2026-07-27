import { similarPositionGroup } from "@/features/scouting/lib/position-scorecard";
import {
  RECRUITMENT_DIMENSION_KEYS,
  RECRUITMENT_DISCLAIMER,
  type RecruitmentBrief,
  type RecruitmentCandidate,
  type RecruitmentDimensionPriorities,
  type RecruitmentFitScore,
} from "@/lib/intelligence/soccer/recruitment-types";
import type { PlayerIntelligenceProfile, SoccerTrajectory } from "@/lib/intelligence/soccer/types";
import { hasReliableSoccerSample } from "@/lib/metrics/per90";
import type { Player } from "@/types";

const DEFAULT_PRIORITIES: Record<string, RecruitmentDimensionPriorities> = {
  ATT: { production: 0.4, creation: 0.25, ball_progression: 0.2, defense: 0.15 },
  MID: { production: 0.2, creation: 0.3, ball_progression: 0.3, defense: 0.2 },
  DEF: { production: 0.15, creation: 0.15, ball_progression: 0.25, defense: 0.45 },
  GK: { production: 0.1, creation: 0.1, ball_progression: 0.25, defense: 0.55 },
};

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

function positionGroupKey(position: string): keyof typeof DEFAULT_PRIORITIES {
  if (position === "GK") return "GK";
  if (["ST", "LW", "RW", "CF"].includes(position)) return "ATT";
  if (["CAM", "CM", "CDM", "LM", "RM"].includes(position)) return "MID";
  return "DEF";
}

export function normalizeRecruitmentPriorities(
  brief: RecruitmentBrief
): Record<string, number> {
  const defaults = DEFAULT_PRIORITIES[positionGroupKey(brief.position)];
  const input = brief.priorities ?? defaults;
  const entries = RECRUITMENT_DIMENSION_KEYS.map((key) => {
    const weight = input[key] ?? defaults[key] ?? 0.25;
    return [key, weight] as const;
  });
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0) || 1;
  return Object.fromEntries(entries.map(([key, weight]) => [key, weight / total]));
}

function trajectoryAdjustment(
  briefTrajectory: SoccerTrajectory | "any" | undefined,
  playerTrajectory: SoccerTrajectory
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

function passesBriefFilters(brief: RecruitmentBrief, player: Player): boolean {
  if ((player.sport ?? "SOCCER") !== "SOCCER") return false;

  const positions = similarPositionGroup(brief.position);
  if (!positions.includes(player.position)) return false;

  if (typeof brief.minAge === "number" && player.age < brief.minAge) return false;
  if (typeof brief.maxAge === "number" && player.age > brief.maxAge) return false;
  if (typeof brief.maxMarketValue === "number" && player.marketValue > brief.maxMarketValue) return false;

  const stats = player.currentSeasonStats;
  const minMinutes = brief.minMinutes ?? 450;
  if (stats.minutesPlayed < minMinutes) return false;
  if (typeof brief.minRating === "number" && stats.rating < brief.minRating) return false;
  if (brief.league && player.league && player.league !== brief.league) return false;

  return true;
}

/** Heuristic recruitment fit — weighted dimension match with role/trajectory bonuses. */
export function scoreRecruitmentFit(
  brief: RecruitmentBrief,
  player: Player,
  profile: PlayerIntelligenceProfile
): RecruitmentFitScore | null {
  if (!passesBriefFilters(brief, player)) return null;

  const weights = normalizeRecruitmentPriorities(brief);
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

  if (brief.preferredRoles?.length) {
    const roleMatch = brief.preferredRoles.some(
      (role) => role.toLowerCase() === profile.role.toLowerCase()
    );
    fitScore += roleMatch ? 8 : -4;
  }

  fitScore += trajectoryAdjustment(brief.trajectory, profile.trajectory);

  if (!hasReliableSoccerSample(player.currentSeasonStats.minutesPlayed)) {
    fitScore -= 12;
  }

  fitScore = clamp(fitScore);

  const reasons = dimensionReasons
    .sort((a, b) => b.contribution - a.contribution)
    .slice(0, 3)
    .map(({ label, contribution }) => `${label} (${Math.round(contribution)} weighted pts)`);

  if (brief.preferredRoles?.includes(profile.role)) {
    reasons.unshift(`Role match: ${profile.role}`);
  }

  const limitations = [
    ...profile.limitations,
    RECRUITMENT_DISCLAIMER,
  ];

  return {
    playerId: player.id,
    fitScore: Number(fitScore.toFixed(1)),
    reasons,
    limitations,
    matchedRole: profile.role,
    trajectory: profile.trajectory,
  };
}

export function toRecruitmentCandidate(player: Player, fit: RecruitmentFitScore): RecruitmentCandidate {
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

export function rankRecruitmentCandidates(
  brief: RecruitmentBrief,
  players: Player[],
  profilesByPlayerId: Map<string, PlayerIntelligenceProfile>
): RecruitmentCandidate[] {
  const ranked: RecruitmentCandidate[] = [];

  for (const player of players) {
    const profile = profilesByPlayerId.get(player.id);
    if (!profile) continue;
    const fit = scoreRecruitmentFit(brief, player, profile);
    if (!fit) continue;
    ranked.push(toRecruitmentCandidate(player, fit));
  }

  ranked.sort((a, b) => b.fitScore - a.fitScore);
  const limit = brief.limit ?? 25;
  return ranked.slice(0, limit);
}
