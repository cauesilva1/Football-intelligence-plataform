import { toRadarProfile } from "@/lib/normalize";
import { hasReliableSoccerSample } from "@/lib/metrics/per90";
import { soccerPositionGroup } from "@/features/scouting/lib/position-scorecard";
import type { SoccerDimensionKey } from "@/lib/intelligence/soccer/types";
import type { Player } from "@/types";

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

/** Raw 0–100 dimension composites — shared by absolute scores and league percentiles. */
export function extractSoccerDimensionRawScores(
  player: Player
): Record<SoccerDimensionKey, number> {
  const stats = player.currentSeasonStats;
  const radar = toRadarProfile(stats);
  const p90 = stats.per90;

  const productionScore = clamp(
    radar.Finishing * 0.55 +
      Math.min(100, p90.goals * 55) * 0.25 +
      Math.min(100, (stats.xG / Math.max(stats.minutesPlayed, 1)) * 90 * 50) * 0.2
  );

  const creationScore = clamp(
    radar.Creation * 0.5 +
      Math.min(100, p90.assists * 70) * 0.25 +
      Math.min(100, p90.keyPasses * 22) * 0.25
  );

  const defenseScore = clamp(
    radar.Defense * 0.55 +
      Math.min(100, p90.tackles * 28) * 0.225 +
      Math.min(100, p90.interceptions * 32) * 0.225
  );

  const ballProgressionScore = clamp(
    radar.Passing * 0.45 + radar.Dribbling * 0.35 + Math.min(100, p90.keyPasses * 18) * 0.2
  );

  const group = soccerPositionGroup(player.position);
  const primaryKey: SoccerDimensionKey =
    group === "DEF" || group === "GK" ? "defense" : "production";

  return {
    production: primaryKey === "defense" ? defenseScore : productionScore,
    creation: creationScore,
    defense: defenseScore,
    ball_progression: ballProgressionScore,
  };
}

export function cohortEligibleForPercentiles(player: Player): boolean {
  return hasReliableSoccerSample(player.currentSeasonStats.minutesPlayed);
}
