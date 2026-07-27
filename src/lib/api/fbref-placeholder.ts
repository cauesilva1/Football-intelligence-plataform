/**
 * FBref & seasonal defensive totals (Stage 8.7).
 *
 * ## Is FBref updated day-to-day?
 * Yes during the season — usually **the day after** matches (Opta-fed tables),
 * not live/in-play. Same practical lag as API-Football season `/players` stats.
 *
 * ## What we use operationally
 * - **Match-level (yesterday):** API-Football `/fixtures/players` via cron
 *   (`data:enrich-defense`) — free tier only covers a rolling recent date window.
 * - **Season totals (scorecards):** API-Football `/players?team=&season=` via
 *   `enrichSeasonDefenseFromApiFootball` — updates `PlayerSeasonStats.tackles`
 *   / `interceptions` without scraping.
 *
 * ## FBref role
 * Offline CSV / future scrape for validation and gaps — see existing ETL CSV
 * path (`TklW` / `Int`). Live scrape is intentionally not the daily path
 * (rate limits + HTML fragility).
 */
export { enrichSeasonDefenseFromApiFootball } from "@/lib/api/enrich-season-defense";

export const FBREF_UPDATE_CADENCE =
  "Season tables typically refresh next day after matchdays — not live.";
