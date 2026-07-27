import { derivePlayingStyle } from "@/features/scouting/lib/playing-style";
import { findSimilarPlayers } from "@/features/scouting/lib/similarity";
import { footballPositionGroup } from "@/features/scouting/lib/position-scorecard";
import { classifyAmericanFootballRole } from "@/lib/intelligence/american-football/classify-american-football-role";
import { computeAmericanFootballDimensions } from "@/lib/intelligence/american-football/compute-american-football-dimensions";
import { computeAmericanFootballTrajectory } from "@/lib/intelligence/american-football/compute-american-football-trajectory";
import { explainAmericanFootballSimilarity } from "@/lib/intelligence/american-football/explain-similarity";
import type { AmericanFootballLeaguePositionPercentileTable } from "@/lib/intelligence/american-football/league-percentiles";
import { lookupAmericanFootballPercentileScores } from "@/lib/intelligence/american-football/league-percentiles";
import {
  AMERICAN_FOOTBALL_DIMENSION_LABELS,
  type AmericanFootballDimensionKey,
} from "@/lib/intelligence/american-football/types";
import type { IntelligencePercentile, IntelligenceProfile } from "@/lib/intelligence/types";
import { hasReliableFootballSample } from "@/lib/scoring/football-rating";
import type { Player } from "@/types";

export interface BuildAmericanFootballIntelligenceProfileOptions {
  comparablesPool?: Player[];
  comparablesLimit?: number;
  percentileTable?: AmericanFootballLeaguePositionPercentileTable | null;
}

function buildLimitations(
  player: Player,
  trajectoryDirection: IntelligenceProfile["trajectory"]["direction"]
): string[] {
  const stats = player.currentSeasonStats;
  const group = footballPositionGroup(player.position);
  const limitations: string[] = [];

  if (
    !hasReliableFootballSample({
      matchesPlayed: stats.appearances,
      minutesPlayed: stats.minutesPlayed,
    })
  ) {
    limitations.push(
      `Small sample (${stats.appearances}G / ${stats.minutesPlayed}′ proxy) — rates and confidence are provisional until ≥6G and ≥360′.`
    );
  }

  if (group === "OL") {
    limitations.push(
      "Offensive line blocking grades are not in the current feed — role and dimensions are participation-based only."
    );
  } else {
    limitations.push(
      "Scheme fit and advanced tracking (separation, pressure rate) are not in the feed — box-score proxies only."
    );
  }

  if (trajectoryDirection === "insufficient_data") {
    limitations.push("Trajectory needs at least two seasons with meaningful games.");
  }

  return limitations;
}

function buildPercentiles(
  percentileScores: Record<AmericanFootballDimensionKey, number> | null,
  table: AmericanFootballLeaguePositionPercentileTable
): IntelligencePercentile[] | undefined {
  if (!percentileScores) return undefined;

  return (Object.keys(percentileScores) as AmericanFootballDimensionKey[]).map((key) => ({
    key,
    label: AMERICAN_FOOTBALL_DIMENSION_LABELS[key],
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

/** Headless American football intelligence profile — pure function, no UI dependencies. */
export function buildAmericanFootballIntelligenceProfile(
  player: Player,
  options: BuildAmericanFootballIntelligenceProfileOptions = {}
): IntelligenceProfile {
  const style = derivePlayingStyle(player);
  const comparablesLimit = options.comparablesLimit ?? 4;
  const pool = options.comparablesPool ?? [];
  const similar =
    pool.length > 0 ? findSimilarPlayers(player, pool, comparablesLimit) : [];

  const season = player.selectedSeason ?? player.currentSeasonStats.season;
  const percentileScores = options.percentileTable
    ? lookupAmericanFootballPercentileScores(player, options.percentileTable)
    : null;
  const leagueLabel = player.competitionName ?? options.percentileTable?.league;
  const trajectory = computeAmericanFootballTrajectory(player);
  const role = classifyAmericanFootballRole(player);

  return {
    sport: "AMERICAN_FOOTBALL",
    playerId: player.id,
    season,
    role,
    styleLabel: style.label,
    styleTraits: style.traits,
    dimensions: computeAmericanFootballDimensions(player, {
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
      why: explainAmericanFootballSimilarity(player, match),
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
