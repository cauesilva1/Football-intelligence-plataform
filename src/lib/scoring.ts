/**
 * Shared scoring / sample-size rules for soccer rates.
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

export const U23_MAX_AGE = 23;
export const PROSPECT_MIN_RATING = 7;
export const OPPORTUNITY_MAX_AGE = 25;
export const OPPORTUNITY_MIN_RATING = 7.2;
export const OPPORTUNITY_MAX_VALUE = 8_000_000;
export const OPPORTUNITY_MAX_CAP_HIT = 5_000_000;
