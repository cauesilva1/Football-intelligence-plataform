import { derivePlayingStyle } from "@/features/scouting/lib/playing-style";
import { findSimilarPlayers } from "@/features/scouting/lib/similarity";
import { classifyBasketballRole } from "@/lib/intelligence/basketball/classify-basketball-role";
import { computeBasketballDimensions } from "@/lib/intelligence/basketball/compute-basketball-dimensions";
import { computeBasketballTrajectory } from "@/lib/intelligence/basketball/compute-basketball-trajectory";
import { explainBasketballSimilarity } from "@/lib/intelligence/basketball/explain-similarity";
import type { BasketballLeaguePositionPercentileTable } from "@/lib/intelligence/basketball/league-percentiles";
import { lookupBasketballPercentileScores } from "@/lib/intelligence/basketball/league-percentiles";
import {
  BASKETBALL_DIMENSION_LABELS,
  type BasketballDimensionKey,
} from "@/lib/intelligence/basketball/types";
import { dataDepthLimitationLines } from "@/lib/intelligence/data-depth";
import type { IntelligencePercentile, IntelligenceProfile } from "@/lib/intelligence/types";
import { hasReliableBasketballSample } from "@/lib/scoring/basketball-rating";
import type { Player } from "@/types";

export interface BuildBasketballIntelligenceProfileOptions {
  comparablesPool?: Player[];
  comparablesLimit?: number;
  percentileTable?: BasketballLeaguePositionPercentileTable | null;
}

function buildLimitations(
  player: Player,
  trajectoryDirection: IntelligenceProfile["trajectory"]["direction"]
): string[] {
  const stats = player.currentSeasonStats;
  const limitations: string[] = [];

  if (
    !hasReliableBasketballSample({
      matchesPlayed: stats.appearances,
      minutesPlayed: stats.minutesPlayed,
    })
  ) {
    limitations.push(
      `Small sample (${stats.appearances}G / ${stats.minutesPlayed}′) — rates and confidence are provisional until ≥10G and ≥200′.`
    );
  }

  limitations.push(
    "Defense uses steals/blocks only — not on-ball or team defensive context."
  );

  for (const line of dataDepthLimitationLines(player)) {
    if (!limitations.includes(line)) limitations.push(line);
  }

  if (
    trajectoryDirection === "insufficient_data" &&
    !limitations.some(
      (line) =>
        line.includes("Data gap") ||
        line.includes("season depth") ||
        line.toLowerCase().includes("trajectory")
    )
  ) {
    limitations.push("Trajectory needs at least two seasons with meaningful games and minutes.");
  }

  return limitations;
}

function buildPercentiles(
  percentileScores: Record<BasketballDimensionKey, number> | null,
  table: BasketballLeaguePositionPercentileTable
): IntelligencePercentile[] | undefined {
  if (!percentileScores) return undefined;

  return (Object.keys(percentileScores) as BasketballDimensionKey[]).map((key) => ({
    key,
    label: BASKETBALL_DIMENSION_LABELS[key],
    percentile: percentileScores[key],
    cohort: `${table.league} · ${table.position}`,
    cohortSize: table.cohortSize,
    confidence: table.cohortSize >= 25 ? 0.85 : table.cohortSize >= 12 ? 0.7 : 0.5,
    limitations:
      table.cohortSize < 12
        ? ["Small cohort — percentile precision is limited"]
        : undefined,
  }));
}

/** Headless basketball intelligence profile — pure function, no UI dependencies. */
export function buildBasketballIntelligenceProfile(
  player: Player,
  options: BuildBasketballIntelligenceProfileOptions = {}
): IntelligenceProfile {
  const style = derivePlayingStyle(player);
  const comparablesLimit = options.comparablesLimit ?? 4;
  const pool = options.comparablesPool ?? [];
  const similar =
    pool.length > 0 ? findSimilarPlayers(player, pool, comparablesLimit) : [];

  const season = player.selectedSeason ?? player.currentSeasonStats.season;
  const percentileScores = options.percentileTable
    ? lookupBasketballPercentileScores(player, options.percentileTable)
    : null;
  const leagueLabel = player.competitionName ?? options.percentileTable?.league;
  const trajectory = computeBasketballTrajectory(player);
  const role = classifyBasketballRole(player);

  return {
    sport: "BASKETBALL",
    playerId: player.id,
    season,
    role,
    styleLabel: style.label,
    styleTraits: style.traits,
    dimensions: computeBasketballDimensions(player, {
      percentileScores: percentileScores ?? undefined,
      leagueLabel: percentileScores ? leagueLabel : undefined,
    }),
    trajectory,
    percentiles: options.percentileTable
      ? buildPercentiles(percentileScores, options.percentileTable)
      : undefined,
    limitations: buildLimitations(player, trajectory.direction),
    comparables: similar.map(({ player: match, score }) => ({
      playerId: match.id,
      score: Number(score.toFixed(1)),
      why: explainBasketballSimilarity(player, match),
    })),
    leagueContext: options.percentileTable
      ? {
          league: options.percentileTable.league,
          leagueName: leagueLabel,
          position: options.percentileTable.position,
          season: options.percentileTable.season,
          cohortSize: options.percentileTable.cohortSize,
          scoringMethod: percentileScores ? "league_percentile" : "absolute",
        }
      : undefined,
  };
}
