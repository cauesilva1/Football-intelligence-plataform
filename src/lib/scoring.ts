/**
 * Shared scoring / sample-size rules.
 * Keep in sync with docs/SCORING.md.
 */

/** Minimum minutes before Goals/90 (and similar rates) are treated as reliable for rankings. */
export const SOCCER_RATE_MIN_MINUTES = 450;

/**
 * Soft ceiling for Goals/90 and Assists/90 displayed from noisy samples.
 * Elite finishing seasons rarely exceed ~1.5; anything above this is almost always
 * a tiny-minutes artefact (e.g. 1 goal in 11 minutes → 8.18).
 */
export const SOCCER_RATE_SOFT_CAP = 1.8;

/** Minimum games before basketball per-game rates / rating are treated as reliable. */
export const BB_RATE_MIN_GAMES = 10;

/** Minimum season minutes alongside BB_RATE_MIN_GAMES. */
export const BB_RATE_MIN_MINUTES = 200;

/** American football — reliable sample for season rating. */
export const AF_RATE_MIN_GAMES = 6;
/** Proxy minutes (games × 60) alongside AF_RATE_MIN_GAMES. */
export const AF_RATE_MIN_MINUTES = 360;

export const U23_MAX_AGE = 23;
export const PROSPECT_MIN_RATING = 7;
export const OPPORTUNITY_MAX_AGE = 25;
export const OPPORTUNITY_MIN_RATING = 7.2;
export const OPPORTUNITY_MAX_VALUE = 8_000_000;
export const OPPORTUNITY_MAX_CAP_HIT = 5_000_000;

/** Rating per $1M Cap Hit — BB/AF market bargains heuristic. */
export function capValueScore(rating: number, capHit: number): number {
  const value = Math.max(capHit, 500_000);
  return Number((rating / (value / 1_000_000)).toFixed(3));
}
