import type { PlayerFilters } from "@/types";
import {
  OPPORTUNITY_MAX_AGE,
  OPPORTUNITY_MAX_VALUE,
  OPPORTUNITY_MIN_RATING,
  PROSPECT_MIN_RATING,
  SOCCER_RATE_MIN_MINUTES,
  U23_MAX_AGE,
} from "@/lib/scoring";
import type { Player } from "@/types";

export {
  computeSoccerRating,
  computeRatingProxy,
  computeReportOverallRating,
  reliableSoccerRating,
  soccerRatingFromRates,
  soccerRatingSmallSample,
} from "@/lib/scoring/soccer-rating";

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
