import type { PlayerIntelligenceProfile } from "@/lib/intelligence/soccer/types";

export interface ScoutingReportBriefIntelligence {
  role: string;
  trajectory: string;
  styleLabel: string;
  dimensions: {
    label: string;
    score: number;
    confidence: number;
    evidence: string[];
  }[];
  limitations: string[];
}

export function toBriefIntelligenceSnapshot(
  profile: PlayerIntelligenceProfile
): ScoutingReportBriefIntelligence {
  return {
    role: profile.role,
    trajectory: profile.trajectory,
    styleLabel: profile.styleLabel,
    dimensions: profile.dimensions.map((dimension) => ({
      label: dimension.label,
      score: dimension.score,
      confidence: dimension.confidence,
      evidence: dimension.evidence.map((item) => `${item.label}: ${item.value}`).slice(0, 3),
    })),
    limitations: profile.limitations,
  };
}

export function formatBriefIntelligenceLines(intelligence: ScoutingReportBriefIntelligence): string[] {
  const lines = [
    `Role: ${intelligence.role} · Style: ${intelligence.styleLabel} · Trajectory: ${intelligence.trajectory}`,
    ...intelligence.dimensions.map(
      (dimension) =>
        `${dimension.label}: ${dimension.score}/100 (confidence ${Math.round(dimension.confidence * 100)}%)`
    ),
  ];

  for (const limitation of intelligence.limitations) {
    lines.push(`Limitation: ${limitation}`);
  }

  return lines;
}
