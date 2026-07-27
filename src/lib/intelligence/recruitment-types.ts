import type { TrajectoryDirection } from "@/lib/intelligence/types";
import type { Sport } from "@/lib/sport";

export const RECRUITMENT_DISCLAIMER =
  "Decision support, not certainty — heuristic fit from available season data.";

export type RecruitmentDataConfidence = "HIGH" | "MEDIUM" | "LOW";

/** Cross-sport recruitment brief — dimension priority keys are sport-owned. */
export interface RecruitmentBrief {
  sport: Extract<Sport, "SOCCER" | "BASKETBALL">;
  position: string;
  league?: string;
  season?: string;
  minAge?: number;
  maxAge?: number;
  maxMarketValue?: number;
  /** NBA-oriented optional constraint (USD annual cap hit). */
  maxCapHit?: number;
  minMinutes?: number;
  minRating?: number;
  priorities?: Record<string, number>;
  preferredRoles?: string[];
  trajectory?: TrajectoryDirection | "any";
  limit?: number;
}

export interface RecruitmentFitScore {
  playerId: string;
  fitScore: number;
  reasons: string[];
  limitations: string[];
  matchedRole: string;
  trajectory: TrajectoryDirection;
  dataConfidence: RecruitmentDataConfidence;
}

export interface RecruitmentCandidate extends RecruitmentFitScore {
  playerName: string;
  position: string;
  age: number;
  rating: number;
  marketValue: number;
  teamName?: string;
}

export interface RecruitmentCandidatesResult {
  disclaimer: string;
  brief: RecruitmentBrief;
  totalEvaluated: number;
  candidates: RecruitmentCandidate[];
}
