import type { Sport } from "@/lib/sport";

export type SoccerTrajectory = "improving" | "stable" | "declining" | "insufficient_data";

export interface IntelligenceEvidence {
  label: string;
  value: string;
}

export type SoccerDimensionKey = "production" | "creation" | "defense" | "ball_progression";

export interface IntelligenceDimension {
  key: SoccerDimensionKey;
  label: string;
  score: number;
  confidence: number;
  evidence: IntelligenceEvidence[];
}

export interface IntelligenceComparable {
  playerId: string;
  score: number;
  why: string[];
}

export interface PlayerIntelligenceProfile {
  playerId: string;
  sport: Extract<Sport, "SOCCER">;
  season: string;
  role: string;
  styleLabel: string;
  styleTraits: string[];
  dimensions: IntelligenceDimension[];
  trajectory: SoccerTrajectory;
  limitations: string[];
  comparables: IntelligenceComparable[];
}
