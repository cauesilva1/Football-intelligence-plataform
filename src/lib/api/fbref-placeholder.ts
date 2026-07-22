/**
 * FBref enrichment (Stage 8.7 — Phase B).
 *
 * Intent: season-level validation / backfill of tacklesWon + interceptions on
 * PlayerSeasonStats when API-Football match coverage is thin.
 *
 * Not implemented yet — scraping FBref is rate-limited and brittle; prefer
 * API-Football `/fixtures/players` (Stage 8.3–8.5) for match-level defense.
 */
export const FBREF_STATUS = "planned" as const;
