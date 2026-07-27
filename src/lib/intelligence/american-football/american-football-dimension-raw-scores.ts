import { footballPositionGroup } from "@/features/scouting/lib/position-scorecard";
import type { AmericanFootballDimensionKey } from "@/lib/intelligence/american-football/types";
import { hasReliableFootballSample } from "@/lib/scoring/football-rating";
import type { Player } from "@/types";

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

/** Absolute 0–100 raw scores from AF season lines — not league-relative. */
export function extractAmericanFootballDimensionRawScores(
  player: Player
): Record<AmericanFootballDimensionKey, number> {
  const stats = player.currentSeasonStats;
  const games = Math.max(stats.appearances, 1);
  const passYpg = (stats.passingYards ?? 0) / games;
  const rushYpg = (stats.rushingYards ?? 0) / games;
  const recYpg = (stats.receivingYards ?? 0) / games;
  const sacksPg = (stats.sacks ?? 0) / games;
  const tacklesPg = stats.tacklesWon / games;
  const group = footballPositionGroup(player.position);

  // Scale anchors roughly match elite NFL box-score rates.
  const passing = clamp((passYpg / 280) * 100);
  const rushing = clamp((rushYpg / 70) * 100);
  const receiving = clamp((recYpg / 80) * 100);
  const disruption = clamp((sacksPg / 0.8) * 100);
  const tackling = clamp((tacklesPg / 8) * 100);

  // OL / specialist have weak counting stats — keep near mid-low absolute.
  if (group === "OL") {
    return {
      passing: 20,
      rushing: 20,
      receiving: 20,
      disruption: 25,
      tackling: 25,
    };
  }

  return { passing, rushing, receiving, disruption, tackling };
}

export function cohortEligibleForAmericanFootballPercentiles(player: Player): boolean {
  const stats = player.currentSeasonStats;
  const group = footballPositionGroup(player.position);
  if (group === "OL") return false; // do not invent OL precision
  return hasReliableFootballSample({
    matchesPlayed: stats.appearances,
    minutesPlayed: stats.minutesPlayed,
  });
}
