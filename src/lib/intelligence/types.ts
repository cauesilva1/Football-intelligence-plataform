import type { Sport } from "@/lib/sport";
import type { Player } from "@/types";

export type TrajectoryDirection =
  | "improving"
  | "stable"
  | "declining"
  | "insufficient_data";

export interface IntelligenceEvidence {
  label: string;
  value: string;
}

export interface IntelligenceDimension {
  /** Sport-owned vocabulary (e.g. scoring, production). */
  key: string;
  label: string;
  score: number;
  confidence: number;
  evidence: IntelligenceEvidence[];
}

export interface IntelligenceRole {
  label: string;
  confidence: number;
  evidence: IntelligenceEvidence[];
}

export interface IntelligenceTrajectory {
  direction: TrajectoryDirection;
  evidence: IntelligenceEvidence[];
}

export interface IntelligenceComparable {
  playerId: string;
  score: number;
  why: string[];
}

export interface IntelligencePercentile {
  key: string;
  label: string;
  percentile: number;
  cohort: string;
  cohortSize: number;
  confidence: number;
  limitations?: string[];
}

export interface IntelligenceLeagueContext {
  league: string;
  leagueName?: string;
  position: string;
  season: string;
  cohortSize: number;
  scoringMethod: "league_percentile" | "absolute";
}

/** Cross-sport intelligence contract — structure only; metrics stay sport-native. */
export interface IntelligenceProfile {
  sport: Sport;
  playerId: string;
  season: string;
  role: IntelligenceRole;
  styleLabel?: string;
  styleTraits?: string[];
  dimensions: IntelligenceDimension[];
  trajectory: IntelligenceTrajectory;
  percentiles?: IntelligencePercentile[];
  limitations: string[];
  comparables: IntelligenceComparable[];
  leagueContext?: IntelligenceLeagueContext;
}

export interface BuildIntelligenceProfileOptions {
  comparablesPool?: Player[];
  comparablesLimit?: number;
  /** Opaque sport-specific percentile table (soccer/BB engines cast internally). */
  percentileTable?: unknown;
}

export interface IntelligenceEngine {
  sport: Sport;
  buildProfile(player: Player, options?: BuildIntelligenceProfileOptions): IntelligenceProfile;
  explainSimilarity?(target: Player, candidate: Player, limit?: number): string[];
}
