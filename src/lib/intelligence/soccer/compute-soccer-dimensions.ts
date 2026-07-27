import { toRadarProfile } from "@/lib/normalize";
import { hasReliableSoccerSample } from "@/lib/metrics/per90";
import { soccerPositionGroup } from "@/features/scouting/lib/position-scorecard";
import { extractSoccerDimensionRawScores } from "@/lib/intelligence/soccer/soccer-dimension-raw-scores";
import type { IntelligenceDimension, SoccerDimensionKey } from "@/lib/intelligence/soccer/types";
import type { Player } from "@/types";

export interface ComputeSoccerDimensionsOptions {
  /** When set, dimension scores use league-relative percentiles (0–100). */
  percentileScores?: Partial<Record<SoccerDimensionKey, number>>;
  leagueLabel?: string;
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

function resolveScore(
  key: SoccerDimensionKey,
  absoluteScore: number,
  options: ComputeSoccerDimensionsOptions
): number {
  const percentile = options.percentileScores?.[key];
  return typeof percentile === "number" ? Math.round(percentile) : Math.round(absoluteScore);
}

/** Four soccer intelligence dimensions with score, confidence, and evidence lines. */
export function computeSoccerDimensions(
  player: Player,
  options: ComputeSoccerDimensionsOptions = {}
): IntelligenceDimension[] {
  const stats = player.currentSeasonStats;
  const radar = toRadarProfile(stats);
  const p90 = stats.per90;
  const confidence = sampleConfidence(stats.minutesPlayed);
  const group = soccerPositionGroup(player.position);
  const defConfidence = defensiveDataGap(stats) ? Math.min(confidence, 0.35) : confidence;
  const raw = extractSoccerDimensionRawScores(player);
  const usingPercentiles = Boolean(options.percentileScores && options.leagueLabel);

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

  if (usingPercentiles && options.leagueLabel) {
    const leagueLine = {
      label: "League percentile",
      value: `${options.leagueLabel} cohort`,
    };
    productionEvidence.push(leagueLine);
    creationEvidence.push(leagueLine);
    defenseEvidence.push(leagueLine);
    ballProgressionEvidence.push(leagueLine);
  }

  const dimensions: IntelligenceDimension[] = [
    {
      key: "production",
      label: group === "DEF" || group === "GK" ? "Defensive contribution" : "Production",
      score: resolveScore(
        group === "DEF" || group === "GK" ? "defense" : "production",
        group === "DEF" || group === "GK" ? raw.defense : raw.production,
        options
      ),
      confidence: group === "DEF" || group === "GK" ? defConfidence : confidence,
      evidence: group === "DEF" || group === "GK" ? defenseEvidence : productionEvidence,
    },
    {
      key: "creation",
      label: "Creation",
      score: resolveScore("creation", raw.creation, options),
      confidence,
      evidence: creationEvidence,
    },
    {
      key: "defense",
      label: "Defense",
      score: resolveScore("defense", raw.defense, options),
      confidence: defConfidence,
      evidence: defenseEvidence,
    },
    {
      key: "ball_progression",
      label: "Ball progression",
      score: resolveScore("ball_progression", raw.ball_progression, options),
      confidence,
      evidence: ballProgressionEvidence,
    },
  ];

  if (group === "ATT") {
    dimensions[0] = {
      key: "production",
      label: "Production",
      score: resolveScore("production", raw.production, options),
      confidence,
      evidence: productionEvidence,
    };
  }

  return dimensions;
}
