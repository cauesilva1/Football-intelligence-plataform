import { basketballPositionGroup } from "@/features/scouting/lib/position-scorecard";
import {
  BASKETBALL_DIMENSION_KEYS,
  BASKETBALL_DIMENSION_LABELS,
  type BasketballDimensionKey,
} from "@/lib/intelligence/basketball/types";
import { extractBasketballDimensionRawScores } from "@/lib/intelligence/basketball/basketball-dimension-raw-scores";
import type { IntelligenceDimension } from "@/lib/intelligence/types";
import { hasReliableBasketballSample } from "@/lib/scoring/basketball-rating";
import type { Player } from "@/types";

export interface ComputeBasketballDimensionsOptions {
  percentileScores?: Partial<Record<BasketballDimensionKey, number>>;
  leagueLabel?: string;
}

function sampleConfidence(appearances: number, minutesPlayed: number): number {
  if (appearances >= 50 && minutesPlayed >= 1200) return 0.95;
  if (appearances >= 30 && minutesPlayed >= 700) return 0.85;
  if (hasReliableBasketballSample({ matchesPlayed: appearances, minutesPlayed })) return 0.7;
  if (appearances >= 5 && minutesPlayed >= 80) return 0.4;
  return 0.15;
}

function formatRate(value: number): string {
  return Number.isFinite(value) ? value.toFixed(1) : "—";
}

function resolveScore(
  key: BasketballDimensionKey,
  absoluteScore: number,
  options: ComputeBasketballDimensionsOptions
): number {
  const percentile = options.percentileScores?.[key];
  return typeof percentile === "number" ? Math.round(percentile) : Math.round(absoluteScore);
}

/** Five basketball intelligence dimensions from box-score lines. */
export function computeBasketballDimensions(
  player: Player,
  options: ComputeBasketballDimensionsOptions = {}
): IntelligenceDimension[] {
  const stats = player.currentSeasonStats;
  const confidence = sampleConfidence(stats.appearances, stats.minutesPlayed);
  const raw = extractBasketballDimensionRawScores(player);
  const group = basketballPositionGroup(player.position);
  const usingPercentiles = Boolean(options.percentileScores && options.leagueLabel);

  const evidenceByKey: Record<BasketballDimensionKey, { label: string; value: string }[]> = {
    scoring: [
      { label: "PPG", value: formatRate(stats.points ?? 0) },
      { label: "Position group", value: group },
    ],
    shooting: [
      { label: "FG%", value: `${formatRate(stats.fieldGoalsPercent ?? 0)}%` },
      { label: "3P%", value: `${formatRate(stats.threePointsPercent ?? 0)}%` },
    ],
    playmaking: [
      { label: "APG", value: formatRate(stats.assists) },
      { label: "Position group", value: group },
    ],
    defense: [
      { label: "SPG", value: formatRate(stats.steals ?? 0) },
      { label: "BPG", value: formatRate(stats.blocks ?? 0) },
      {
        label: "Note",
        value: "Box-score steals/blocks only — not tracking defense",
      },
    ],
    rebounding: [
      { label: "RPG", value: formatRate(stats.rebounds ?? 0) },
      { label: "Position group", value: group },
    ],
  };

  if (usingPercentiles && options.leagueLabel) {
    const leagueLine = {
      label: "League percentile",
      value: `${options.leagueLabel} cohort`,
    };
    for (const key of BASKETBALL_DIMENSION_KEYS) {
      evidenceByKey[key].push(leagueLine);
    }
  }

  return BASKETBALL_DIMENSION_KEYS.map((key) => ({
    key,
    label: BASKETBALL_DIMENSION_LABELS[key],
    score: resolveScore(key, raw[key], options),
    confidence: key === "defense" ? Math.min(confidence, 0.65) : confidence,
    evidence: evidenceByKey[key],
  }));
}
