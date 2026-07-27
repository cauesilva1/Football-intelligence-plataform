import { footballPositionGroup } from "@/features/scouting/lib/position-scorecard";
import { extractAmericanFootballDimensionRawScores } from "@/lib/intelligence/american-football/american-football-dimension-raw-scores";
import {
  AMERICAN_FOOTBALL_DIMENSION_KEYS,
  AMERICAN_FOOTBALL_DIMENSION_LABELS,
  type AmericanFootballDimensionKey,
} from "@/lib/intelligence/american-football/types";
import type { IntelligenceDimension } from "@/lib/intelligence/types";
import { hasReliableFootballSample } from "@/lib/scoring/football-rating";
import type { Player } from "@/types";

export interface ComputeAmericanFootballDimensionsOptions {
  percentileScores?: Partial<Record<AmericanFootballDimensionKey, number>>;
  leagueLabel?: string;
}

function sampleConfidence(appearances: number, minutesPlayed: number, group: string): number {
  if (group === "OL") return 0.25;
  if (appearances >= 14 && minutesPlayed >= 700) return 0.9;
  if (hasReliableFootballSample({ matchesPlayed: appearances, minutesPlayed })) return 0.7;
  if (appearances >= 3 && minutesPlayed >= 120) return 0.4;
  return 0.15;
}

function formatInt(value: number): string {
  return Number.isFinite(value) ? Math.round(value).toLocaleString("en-US") : "—";
}

function formatRate(value: number): string {
  return Number.isFinite(value) ? value.toFixed(1) : "—";
}

function resolveScore(
  key: AmericanFootballDimensionKey,
  absoluteScore: number,
  options: ComputeAmericanFootballDimensionsOptions
): number {
  const percentile = options.percentileScores?.[key];
  return typeof percentile === "number" ? Math.round(percentile) : Math.round(absoluteScore);
}

/** Five American football intelligence dimensions from season box-score lines. */
export function computeAmericanFootballDimensions(
  player: Player,
  options: ComputeAmericanFootballDimensionsOptions = {}
): IntelligenceDimension[] {
  const stats = player.currentSeasonStats;
  const group = footballPositionGroup(player.position);
  const confidence = sampleConfidence(stats.appearances, stats.minutesPlayed, group);
  const raw = extractAmericanFootballDimensionRawScores(player);
  const usingPercentiles = Boolean(options.percentileScores && options.leagueLabel);
  const games = Math.max(stats.appearances, 1);

  const evidenceByKey: Record<
    AmericanFootballDimensionKey,
    { label: string; value: string }[]
  > = {
    passing: [
      { label: "Pass Yds", value: formatInt(stats.passingYards ?? 0) },
      { label: "Pass Yds/G", value: formatRate((stats.passingYards ?? 0) / games) },
    ],
    rushing: [
      { label: "Rush Yds", value: formatInt(stats.rushingYards ?? 0) },
      { label: "Rush Yds/G", value: formatRate((stats.rushingYards ?? 0) / games) },
    ],
    receiving: [
      { label: "Rec Yds", value: formatInt(stats.receivingYards ?? 0) },
      { label: "Rec Yds/G", value: formatRate((stats.receivingYards ?? 0) / games) },
    ],
    disruption: [
      { label: "Sacks", value: formatRate(stats.sacks ?? 0) },
      { label: "Position group", value: group },
    ],
    tackling: [
      { label: "Tackles", value: formatRate(stats.tacklesWon) },
      { label: "INT", value: formatInt(stats.interceptions) },
    ],
  };

  if (group === "OL") {
    for (const key of AMERICAN_FOOTBALL_DIMENSION_KEYS) {
      evidenceByKey[key].push({
        label: "Note",
        value: "OL counting stats are sparse — scores are provisional placeholders",
      });
    }
  }

  if (usingPercentiles && options.leagueLabel) {
    const leagueLine = {
      label: "League percentile",
      value: `${options.leagueLabel} cohort`,
    };
    for (const key of AMERICAN_FOOTBALL_DIMENSION_KEYS) {
      evidenceByKey[key].push(leagueLine);
    }
  }

  return AMERICAN_FOOTBALL_DIMENSION_KEYS.map((key) => ({
    key,
    label: AMERICAN_FOOTBALL_DIMENSION_LABELS[key],
    score: resolveScore(key, raw[key], options),
    confidence: group === "OL" ? Math.min(confidence, 0.3) : confidence,
    evidence: evidenceByKey[key],
  }));
}
