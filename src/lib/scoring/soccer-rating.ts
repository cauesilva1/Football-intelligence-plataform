/**
 * Single source of truth for soccer player ratings.
 *
 * ETL write, list/display, map-season, and reports all use the canonical
 * productivity formula (methodology / docs): 6 + g90×0.35 + a90×0.25.
 */
import { SOCCER_RATE_MIN_MINUTES, SOCCER_RATE_SOFT_CAP } from "@/lib/scoring";

export type SoccerRatingStat = {
  minutesPlayed: number;
  goals: number;
  assists: number;
};

export type SoccerRatingProxyStat = SoccerRatingStat & {
  tacklesWon: number;
  interceptions: number;
  yellowCards: number;
  redCards: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function softCapRate(total: number, minutesPlayed: number, cap = SOCCER_RATE_SOFT_CAP): number {
  if (minutesPlayed <= 0) return 0;
  return Math.min((total / minutesPlayed) * 90, cap);
}

/** Conservative rating when sample is below SOCCER_RATE_MIN_MINUTES. */
export function soccerRatingSmallSample(stat: SoccerRatingStat): number {
  const limited =
    6 + Math.min(stat.goals, 5) * 0.08 + Math.min(stat.assists, 5) * 0.05;
  const samplePenalty = stat.minutesPlayed < 180 ? 0.35 : 0.15;
  return Number(Math.min(7, Math.max(5, limited - samplePenalty)).toFixed(2));
}

/**
 * Canonical productivity formula (methodology / docs):
 *   6 + g90×0.35 + a90×0.25  → clamp [5, 10]
 */
export function soccerRatingFromRates(stat: SoccerRatingStat): number {
  const goalsPer90 = softCapRate(stat.goals, Math.max(stat.minutesPlayed, 1));
  const assistsPer90 = softCapRate(stat.assists, Math.max(stat.minutesPlayed, 1));
  const rating = 6 + goalsPer90 * 0.35 + assistsPer90 * 0.25;
  return Number(clamp(rating, 5, 10).toFixed(2));
}

/** Compute rating from season totals — used by map-season-stats, ETL, and reports. */
export function computeSoccerRating(stat: SoccerRatingStat): number {
  if (stat.minutesPlayed < SOCCER_RATE_MIN_MINUTES) {
    return soccerRatingSmallSample(stat);
  }
  return soccerRatingFromRates(stat);
}

/**
 * @deprecated Alias of computeSoccerRating — kept so ETL imports keep working.
 * Position/defense bonuses are no longer applied (methodology is goals/assists only).
 */
export function computeRatingProxy(stat: SoccerRatingProxyStat, _position: string): number {
  return computeSoccerRating(stat);
}

/**
 * Display / filter rating for list rows — always the canonical formula
 * (ignores stored proxy values so list/profile/report stay aligned).
 */
export function reliableSoccerRating(stat: SoccerRatingStat & { rating: number }): number {
  return computeSoccerRating(stat);
}

/** Report overall rating — same rules as list/profile (no parallel AI formula). */
export function computeReportOverallRating(stat: SoccerRatingStat & { rating: number }): number {
  return Number(reliableSoccerRating(stat).toFixed(1));
}

/**
 * Single-match productivity proxy (Sofascore-inspired publicly: start ~6.5).
 * Not Opta/Sofascore — transparent weights on the boxscore fields we store.
 */
export function computeMatchRating(stat: {
  minutesPlayed: number;
  goals: number;
  assists: number;
  tackles: number;
  interceptions: number;
  passesCompleted?: number;
  passesAttempted?: number;
}): number | null {
  if (stat.minutesPlayed <= 0) return null;

  let rating = 6.5;
  rating += Math.min(stat.goals, 3) * 1.0;
  rating += Math.min(stat.assists, 3) * 0.7;
  rating += Math.min(stat.tackles, 8) * 0.12;
  rating += Math.min(stat.interceptions, 8) * 0.1;

  const attempted = stat.passesAttempted ?? 0;
  const completed = stat.passesCompleted ?? 0;
  if (attempted >= 15) {
    const accuracy = completed / attempted;
    rating += (accuracy - 0.7) * 0.8;
  }

  if (stat.minutesPlayed < 20) {
    rating = 6.5 + (rating - 6.5) * 0.45;
  } else if (stat.minutesPlayed < 45) {
    rating = 6.5 + (rating - 6.5) * 0.75;
  }

  return Number(clamp(rating, 3, 10).toFixed(2));
}
