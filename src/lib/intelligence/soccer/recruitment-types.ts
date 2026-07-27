import type { SoccerDimensionKey } from "@/lib/intelligence/soccer/types";

export {
  RECRUITMENT_DISCLAIMER,
  type RecruitmentBrief,
  type RecruitmentCandidate,
  type RecruitmentCandidatesResult,
  type RecruitmentDataConfidence,
  type RecruitmentFitScore,
} from "@/lib/intelligence/recruitment-types";

/** Soccer-native priority keys (optional form of RecruitmentBrief.priorities). */
export interface RecruitmentDimensionPriorities {
  production?: number;
  creation?: number;
  defense?: number;
  ball_progression?: number;
}

export const RECRUITMENT_DIMENSION_KEYS: SoccerDimensionKey[] = [
  "production",
  "creation",
  "defense",
  "ball_progression",
];
