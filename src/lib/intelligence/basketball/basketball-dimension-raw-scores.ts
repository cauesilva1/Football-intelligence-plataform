import { basketballPositionGroup } from "@/features/scouting/lib/position-scorecard";
import { hasReliableBasketballSample } from "@/lib/scoring/basketball-rating";
import type { BasketballDimensionKey } from "@/lib/intelligence/basketball/types";
import type { Player } from "@/types";

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

/** Absolute 0–100 raw scores from box-score averages — not league-relative. */
export function extractBasketballDimensionRawScores(
  player: Player
): Record<BasketballDimensionKey, number> {
  const stats = player.currentSeasonStats;
  const points = stats.points ?? 0;
  const assists = stats.assists;
  const rebounds = stats.rebounds ?? 0;
  const steals = stats.steals ?? 0;
  const blocks = stats.blocks ?? 0;
  const fg = stats.fieldGoalsPercent ?? 0;
  const three = stats.threePointsPercent ?? 0;
  const group = basketballPositionGroup(player.position);

  const scoring = clamp((points / 30) * 100);
  const shooting =
    group === "BIG"
      ? clamp(fg * 1.05)
      : clamp(fg * 0.55 + three * 0.45);
  const playmaking = clamp((assists / 10) * 100);
  const defense = clamp(((steals / 2.5) * 55 + (blocks / 2.5) * 45));
  const reboundingScore = clamp((rebounds / 12) * 100);

  return {
    scoring,
    shooting,
    playmaking,
    defense,
    rebounding: reboundingScore,
  };
}

export function cohortEligibleForBasketballPercentiles(player: Player): boolean {
  const stats = player.currentSeasonStats;
  return hasReliableBasketballSample({
    matchesPlayed: stats.appearances,
    minutesPlayed: stats.minutesPlayed,
  });
}
