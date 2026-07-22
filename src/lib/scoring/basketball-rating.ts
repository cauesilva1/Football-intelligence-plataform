/**
 * Single source of truth for basketball player ratings.
 *
 * Season stats in this repo store counting lines as **per-game averages**
 * (points/rebounds/…) and minutes as a **season total**. Sample guards use
 * matchesPlayed (+ minutes) so short bursts cannot print a 9.5.
 */
import { BB_RATE_MIN_GAMES, BB_RATE_MIN_MINUTES } from "@/lib/scoring";

export type BasketballRatingStat = {
  matchesPlayed: number;
  minutesPlayed: number;
  /** Per-game averages (as stored on PlayerSeasonStats for NBA sync). */
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function hasReliableBasketballSample(stat: {
  matchesPlayed: number;
  minutesPlayed: number;
}): boolean {
  return (
    stat.matchesPlayed >= BB_RATE_MIN_GAMES &&
    stat.minutesPlayed >= BB_RATE_MIN_MINUTES
  );
}

/** Conservative rating when games/minutes are below the reliability floor. */
export function basketballRatingSmallSample(stat: BasketballRatingStat): number {
  const limited =
    6 +
    Math.min(stat.points, 25) * 0.04 +
    Math.min(stat.rebounds, 12) * 0.03 +
    Math.min(stat.assists, 10) * 0.04;
  const samplePenalty = stat.matchesPlayed < 5 ? 0.35 : 0.15;
  return Number(clamp(limited - samplePenalty, 5, 7).toFixed(2));
}

/**
 * Canonical productivity formula (methodology / docs):
 *   6 + PPG×0.08 + RPG×0.04 + APG×0.06 + SPG×0.18 + BPG×0.14  → clamp [5, 10]
 */
export function basketballRatingFromAverages(stat: BasketballRatingStat): number {
  const rating =
    6 +
    Math.min(stat.points, 40) * 0.08 +
    Math.min(stat.rebounds, 18) * 0.04 +
    Math.min(stat.assists, 14) * 0.06 +
    Math.min(stat.steals, 4) * 0.18 +
    Math.min(stat.blocks, 4) * 0.14;
  return Number(clamp(rating, 5, 10).toFixed(2));
}

/** Compute rating from season averages — used by map-season-stats and reports. */
export function computeBasketballRating(stat: BasketballRatingStat): number {
  if (!hasReliableBasketballSample(stat)) {
    return basketballRatingSmallSample(stat);
  }
  return basketballRatingFromAverages(stat);
}

/**
 * Display / filter rating for list rows.
 * Tiny samples must not keep a stored 9.5 from noisy per-game spikes.
 */
export function reliableBasketballRating(
  stat: BasketballRatingStat & { rating: number }
): number {
  if (!hasReliableBasketballSample(stat)) {
    return basketballRatingSmallSample(stat);
  }

  const fromAverages = basketballRatingFromAverages(stat);
  if (stat.rating >= 8.5 && fromAverages < 7.5) {
    return fromAverages;
  }

  return Number(stat.rating.toFixed(2));
}

/** Report overall rating — same rules as list/profile. */
export function computeBasketballReportOverallRating(
  stat: BasketballRatingStat & { rating: number }
): number {
  return Number(reliableBasketballRating(stat).toFixed(1));
}

/**
 * Single-game productivity proxy (Sofascore-inspired publicly: start ~6.5).
 * Column mapping on PlayerMatchStat (no BB-native columns yet):
 *   goals→PTS, assists→AST, tackles→STL, interceptions→BLK, passesCompleted→REB
 */
export function computeBasketballMatchRating(stat: {
  minutesPlayed: number;
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  fieldGoalsMade?: number;
  fieldGoalsAttempted?: number;
}): number | null {
  if (stat.minutesPlayed <= 0) return null;

  let rating = 6.5;
  rating += Math.min(stat.points, 40) * 0.045;
  rating += Math.min(stat.rebounds, 20) * 0.05;
  rating += Math.min(stat.assists, 15) * 0.08;
  rating += Math.min(stat.steals, 6) * 0.22;
  rating += Math.min(stat.blocks, 6) * 0.18;

  const attempted = stat.fieldGoalsAttempted ?? 0;
  const made = stat.fieldGoalsMade ?? 0;
  if (attempted >= 5) {
    const fg = made / attempted;
    rating += (fg - 0.45) * 1.2;
  }

  if (stat.minutesPlayed < 12) {
    rating = 6.5 + (rating - 6.5) * 0.4;
  } else if (stat.minutesPlayed < 24) {
    rating = 6.5 + (rating - 6.5) * 0.75;
  }

  return Number(clamp(rating, 3, 10).toFixed(2));
}
