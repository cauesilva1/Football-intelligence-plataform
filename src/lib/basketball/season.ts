/**
 * Date-based basketball season keys, so a new campaign is ingested without a code change.
 * PlayerSeasonStats / PlayerMatchStat store a campaign as a compact int: 2026-27 → 202627.
 */

/** 2026 → 202627. */
export function basketballSeasonKey(startYear: number): number {
  const endYY = String((startYear + 1) % 100).padStart(2, "0");
  return Number(`${startYear}${endYY}`);
}

/** Start year of the campaign that begins in the calendar year `now` falls in, after `rolloverMonth` (0 = Jan). */
function seasonStartYear(now: Date, rolloverMonth: number): number {
  const year = now.getUTCFullYear();
  return now.getUTCMonth() >= rolloverMonth ? year : year - 1;
}

/**
 * NBA / NBA Summer League. Rolls over on 1 July: summer league and offseason roster work
 * already belong to the upcoming campaign.
 */
export function resolveNbaBoxscoreSeason(now = new Date()): number {
  return basketballSeasonKey(seasonStartYear(now, 6));
}

/** NCAA men's basketball. Rolls over on 1 November, when games actually start. */
export function resolveNcaaBoxscoreSeason(now = new Date()): number {
  return basketballSeasonKey(seasonStartYear(now, 10));
}

/**
 * EuroLeague API season code (E2026) and persisted key (202627).
 * Rolls over on 1 July: clubs and rosters are published over the summer, games start in late September.
 */
export function resolveEuroLeagueSeason(now = new Date()): { code: string; year: number } {
  const startYear = seasonStartYear(now, 6);
  return { code: `E${startYear}`, year: basketballSeasonKey(startYear) };
}
