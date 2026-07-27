import { toRadarProfile } from "@/lib/normalize";
import { hasReliableSoccerSample } from "@/lib/metrics/per90";
import { soccerPositionGroup } from "@/features/scouting/lib/position-scorecard";
import type { IntelligenceDimension } from "@/lib/intelligence/soccer/types";
import type { Player } from "@/types";

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

function sampleConfidence(minutesPlayed: number): number {
  if (minutesPlayed >= 1350) return 0.95;
  if (minutesPlayed >= 900) return 0.85;
  if (minutesPlayed >= 450) return 0.7;
  if (minutesPlayed >= 180) return 0.4;
  return 0.15;
}

function formatRate(value: number): string {
  return Number.isFinite(value) ? value.toFixed(2) : "—";
}

function defensiveDataGap(stats: Player["currentSeasonStats"]): boolean {
  return (
    hasReliableSoccerSample(stats.minutesPlayed) &&
    stats.tacklesWon === 0 &&
    stats.interceptions === 0
  );
}

/** Four soccer intelligence dimensions with score, confidence, and evidence lines. */
export function computeSoccerDimensions(player: Player): IntelligenceDimension[] {
  const stats = player.currentSeasonStats;
  const radar = toRadarProfile(stats);
  const p90 = stats.per90;
  const confidence = sampleConfidence(stats.minutesPlayed);
  const group = soccerPositionGroup(player.position);
  const defConfidence = defensiveDataGap(stats) ? Math.min(confidence, 0.35) : confidence;

  const productionScore = clamp(
    radar.Finishing * 0.55 + Math.min(100, p90.goals * 55) * 0.25 + Math.min(100, (stats.xG / Math.max(stats.minutesPlayed, 1)) * 90 * 50) * 0.2
  );

  const creationScore = clamp(
    radar.Creation * 0.5 + Math.min(100, p90.assists * 70) * 0.25 + Math.min(100, p90.keyPasses * 22) * 0.25
  );

  const defenseScore = clamp(
    radar.Defense * 0.55 + Math.min(100, p90.tackles * 28) * 0.225 + Math.min(100, p90.interceptions * 32) * 0.225
  );

  const ballProgressionScore = clamp(
    radar.Passing * 0.45 + radar.Dribbling * 0.35 + Math.min(100, p90.keyPasses * 18) * 0.2
  );

  const productionEvidence = [
    { label: "Goals / 90", value: formatRate(p90.goals) },
    { label: "xG / 90", value: formatRate((stats.xG / Math.max(stats.minutesPlayed, 1)) * 90) },
    { label: "Finishing index", value: `${Math.round(radar.Finishing)}/100` },
  ];

  const creationEvidence = [
    { label: "Assists / 90", value: formatRate(p90.assists) },
    { label: "Key passes / 90", value: formatRate(p90.keyPasses) },
    { label: "Creation index", value: `${Math.round(radar.Creation)}/100` },
  ];

  const defenseEvidence = [
    { label: "Tackles / 90", value: formatRate(p90.tackles) },
    { label: "Interceptions / 90", value: formatRate(p90.interceptions) },
    { label: "Defense index", value: `${Math.round(radar.Defense)}/100` },
  ];

  const ballProgressionEvidence = [
    { label: "Pass accuracy", value: `${Math.round(stats.passAccuracy)}%` },
    { label: "Dribbles / 90", value: formatRate(p90.dribbles) },
    { label: "Passing index", value: `${Math.round(radar.Passing)}/100` },
  ];

  const dimensions: IntelligenceDimension[] = [
    {
      key: "production",
      label: group === "DEF" || group === "GK" ? "Defensive contribution" : "Production",
      score: Math.round(group === "DEF" || group === "GK" ? defenseScore : productionScore),
      confidence: group === "DEF" || group === "GK" ? defConfidence : confidence,
      evidence: group === "DEF" || group === "GK" ? defenseEvidence : productionEvidence,
    },
    {
      key: "creation",
      label: "Creation",
      score: Math.round(creationScore),
      confidence,
      evidence: creationEvidence,
    },
    {
      key: "defense",
      label: "Defense",
      score: Math.round(defenseScore),
      confidence: defConfidence,
      evidence: defenseEvidence,
    },
    {
      key: "ball_progression",
      label: "Ball progression",
      score: Math.round(ballProgressionScore),
      confidence,
      evidence: ballProgressionEvidence,
    },
  ];

  if (group === "ATT") {
    dimensions[0] = {
      key: "production",
      label: "Production",
      score: Math.round(productionScore),
      confidence,
      evidence: productionEvidence,
    };
  }

  return dimensions;
}