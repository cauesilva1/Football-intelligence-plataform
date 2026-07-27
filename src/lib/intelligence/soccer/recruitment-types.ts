import type { SoccerDimensionKey, SoccerTrajectory } from "@/lib/intelligence/soccer/types";
import type { Sport } from "@/lib/sport";

export const RECRUITMENT_DISCLAIMER =
  "Decision support, not certainty — heuristic fit from available season data.";

export interface RecruitmentDimensionPriorities {
  production?: number;
  creation?: number;
  defense?: number;
  ball_progression?: number;
}

export interface RecruitmentBrief {
  sport: Extract<Sport, "SOCCER">;
  position: string;
  league?: string;
  season?: string;
  minAge?: number;
  maxAge?: number;
  maxMarketValue?: number;
  minMinutes?: number;
  minRating?: number;
  priorities?: RecruitmentDimensionPriorities;
  preferredRoles?: string[];
  trajectory?: SoccerTrajectory | "any";
  limit?: number;
}

export interface RecruitmentFitScore {
  playerId: string;
  fitScore: number;
  reasons: string[];
  limitations: string[];
  matchedRole: string;
  trajectory: SoccerTrajectory;
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

export const RECRUITMENT_DIMENSION_KEYS: SoccerDimensionKey[] = [
  "production",
  "creation",
  "defense",
  "ball_progression",
];
