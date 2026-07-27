import { derivePlayingStyle } from "@/features/scouting/lib/playing-style";
import { findSimilarPlayers } from "@/features/scouting/lib/similarity";
import { classifySoccerRole } from "@/lib/intelligence/soccer/classify-soccer-role";
import { computeSoccerDimensions } from "@/lib/intelligence/soccer/compute-soccer-dimensions";
import { computeSoccerTrajectory } from "@/lib/intelligence/soccer/compute-soccer-trajectory";
import { explainSoccerSimilarity } from "@/lib/intelligence/soccer/explain-similarity";
import type { LeaguePositionPercentileTable } from "@/lib/intelligence/soccer/league-percentiles";
import { lookupPlayerPercentileScores } from "@/lib/intelligence/soccer/league-percentiles";
import { dataDepthLimitationLines } from "@/lib/intelligence/data-depth";
import type { PlayerIntelligenceProfile } from "@/lib/intelligence/soccer/types";
import { hasReliableSoccerSample } from "@/lib/metrics/per90";
import type { Player } from "@/types";

export interface BuildSoccerIntelligenceProfileOptions {
  comparablesPool?: Player[];
  comparablesLimit?: number;
  percentileTable?: LeaguePositionPercentileTable | null;
}

function buildLimitations(player: Player): string[] {
  const stats = player.currentSeasonStats;
  const limitations: string[] = [];

  if (!hasReliableSoccerSample(stats.minutesPlayed)) {
    limitations.push(
      `Small sample (${stats.minutesPlayed}′) — rates and confidence are provisional until ≥450′.`
    );
  }

  if (
    hasReliableSoccerSample(stats.minutesPlayed) &&
    stats.tacklesWon === 0 &&
    stats.interceptions === 0
  ) {
    limitations.push("Defensive actions may be incomplete — pending API-Football enrichment.");
  }

  for (const line of dataDepthLimitationLines(player)) {
    if (!limitations.includes(line)) limitations.push(line);
  }

  if (
    computeSoccerTrajectory(player) === "insufficient_data" &&
    !limitations.some(
      (line) =>
        line.includes("Data gap") ||
        line.includes("season depth") ||
        line.toLowerCase().includes("trajectory")
    )
  ) {
    limitations.push("Trajectory needs at least two seasons with meaningful minutes.");
  }

  return limitations;
}

/** Headless soccer intelligence profile — pure function, no UI dependencies. */
export function buildSoccerIntelligenceProfile(
  player: Player,
  options: BuildSoccerIntelligenceProfileOptions = {}
): PlayerIntelligenceProfile {
  const style = derivePlayingStyle(player);
  const comparablesLimit = options.comparablesLimit ?? 4;
  const pool = options.comparablesPool ?? [];
  const similar =
    pool.length > 0 ? findSimilarPlayers(player, pool, comparablesLimit) : [];

  const season = player.selectedSeason ?? player.currentSeasonStats.season;
  const percentileScores = options.percentileTable
    ? lookupPlayerPercentileScores(player, options.percentileTable)
    : null;
  const leagueLabel = player.competitionName ?? options.percentileTable?.league;

  return {
    playerId: player.id,
    sport: "SOCCER",
    season,
    role: classifySoccerRole(player),
    styleLabel: style.label,
    styleTraits: style.traits,
    dimensions: computeSoccerDimensions(player, {
      percentileScores: percentileScores ?? undefined,
      leagueLabel: percentileScores ? leagueLabel : undefined,
    }),
    trajectory: computeSoccerTrajectory(player),
    limitations: buildLimitations(player),
    comparables: similar.map(({ player: match, score }) => ({
      playerId: match.id,
      score: Number(score.toFixed(1)),
      why: explainSoccerSimilarity(player, match),
    })),
    leagueContext: options.percentileTable
      ? {
          league: options.percentileTable.league,
          leagueName: player.competitionName,
          position: options.percentileTable.position,
          season: options.percentileTable.season,
          cohortSize: options.percentileTable.cohortSize,
          scoringMethod: percentileScores ? "league_percentile" : "absolute",
        }
      : undefined,
  };
}
