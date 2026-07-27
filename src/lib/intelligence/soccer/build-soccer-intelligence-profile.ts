import { derivePlayingStyle } from "@/features/scouting/lib/playing-style";
import { findSimilarPlayers } from "@/features/scouting/lib/similarity";
import { classifySoccerRole } from "@/lib/intelligence/soccer/classify-soccer-role";
import { computeSoccerDimensions } from "@/lib/intelligence/soccer/compute-soccer-dimensions";
import { computeSoccerTrajectory } from "@/lib/intelligence/soccer/compute-soccer-trajectory";
import { explainSoccerSimilarity } from "@/lib/intelligence/soccer/explain-similarity";
import type { PlayerIntelligenceProfile } from "@/lib/intelligence/soccer/types";
import { hasReliableSoccerSample } from "@/lib/metrics/per90";
import type { Player } from "@/types";

export interface BuildSoccerIntelligenceProfileOptions {
  comparablesPool?: Player[];
  comparablesLimit?: number;
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

  if (computeSoccerTrajectory(player) === "insufficient_data") {
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

  return {
    playerId: player.id,
    sport: "SOCCER",
    season: player.selectedSeason ?? player.currentSeasonStats.season,
    role: classifySoccerRole(player),
    styleLabel: style.label,
    styleTraits: style.traits,
    dimensions: computeSoccerDimensions(player),
    trajectory: computeSoccerTrajectory(player),
    limitations: buildLimitations(player),
    comparables: similar.map(({ player: match, score }) => ({
      playerId: match.id,
      score: Number(score.toFixed(1)),
      why: explainSoccerSimilarity(player, match),
    })),
  };
}
