import type { PlayerFilters } from "@/types";
import {
  OPPORTUNITY_MAX_AGE,
  OPPORTUNITY_MAX_VALUE,
  OPPORTUNITY_MIN_RATING,
  PROSPECT_MIN_RATING,
  SOCCER_RATE_MIN_MINUTES,
  SOCCER_RATE_SOFT_CAP,
  U23_MAX_AGE,
} from "@/lib/scoring";
import type { Player } from "@/types";

/** Same rules as dashboard Top Prospects — keep rankings in sync. */
export const SOCCER_U23_RANKING_FILTERS: Pick<
  PlayerFilters,
  "maxAge" | "minRating" | "minMinutes" | "sortBy" | "sortDir"
> = {
  maxAge: U23_MAX_AGE,
  minRating: PROSPECT_MIN_RATING,
  minMinutes: SOCCER_RATE_MIN_MINUTES,
  sortBy: "rating",
  sortDir: "desc",
};

/** Same thresholds as dashboard Market Opportunities. */
export const SOCCER_HIDDEN_GEM_FILTERS: Pick<
  PlayerFilters,
  "maxAge" | "minRating" | "minMinutes" | "maxMarketValue" | "sortBy" | "sortDir"
> = {
  maxAge: OPPORTUNITY_MAX_AGE,
  minRating: OPPORTUNITY_MIN_RATING,
  minMinutes: SOCCER_RATE_MIN_MINUTES,
  maxMarketValue: OPPORTUNITY_MAX_VALUE,
  sortBy: "valueScore",
  sortDir: "desc",
};

/**
 * Display / filter rating for soccer list rows.
 * Tiny samples must not keep a stored 9.5 from defensive per-90 noise.
 */
export function reliableSoccerRating(stat: {
  minutesPlayed: number;
  goals: number;
  assists: number;
  rating: number;
}): number {
  if (stat.minutesPlayed < SOCCER_RATE_MIN_MINUTES) {
    const limited =
      6 + Math.min(stat.goals, 5) * 0.08 + Math.min(stat.assists, 5) * 0.05;
    const samplePenalty = stat.minutesPlayed < 180 ? 0.35 : 0.15;
    return Number(Math.min(7, Math.max(5, limited - samplePenalty)).toFixed(2));
  }

  const goalsPer90 = Math.min(
    (stat.goals / Math.max(stat.minutesPlayed, 1)) * 90,
    SOCCER_RATE_SOFT_CAP
  );
  const assistsPer90 = Math.min(
    (stat.assists / Math.max(stat.minutesPlayed, 1)) * 90,
    SOCCER_RATE_SOFT_CAP
  );
  const fromRates = 6 + goalsPer90 * 0.35 + assistsPer90 * 0.25;

  if (stat.rating >= 8.5 && fromRates < 7.5) {
    return Number(Math.min(10, Math.max(5, fromRates)).toFixed(2));
  }

  return stat.rating;
}

/** Rating per euro — used to rank Hidden Gems (higher = better value). */
export function soccerValueScore(rating: number, marketValue: number): number {
  const value = Math.max(marketValue, 250_000);
  return Number((rating / (value / 1_000_000)).toFixed(3));
}

export function passesSoccerTopProspect(player: Player): boolean {
  const stats = player.currentSeasonStats;
  return (
    player.age <= U23_MAX_AGE &&
    stats.rating >= PROSPECT_MIN_RATING &&
    stats.minutesPlayed >= SOCCER_RATE_MIN_MINUTES
  );
}

export function passesSoccerHiddenGem(player: Player): boolean {
  const stats = player.currentSeasonStats;
  return (
    player.age <= OPPORTUNITY_MAX_AGE &&
    stats.rating >= OPPORTUNITY_MIN_RATING &&
    stats.minutesPlayed >= SOCCER_RATE_MIN_MINUTES &&
    player.marketValue > 0 &&
    player.marketValue <= OPPORTUNITY_MAX_VALUE
  );
}
