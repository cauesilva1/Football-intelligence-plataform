/** ESPN American football season year = calendar year the season starts (e.g. 2025). */

export function footballSeasonLabel(seasonYear: number): string {
  return String(seasonYear);
}

/**
 * Past = last completed campaign; current = upcoming/in-progress.
 * Before September: default to past (offseason). From Sept: prefer current.
 */
export function resolveFootballHubSeasonYears(now = new Date()): {
  currentYear: number;
  pastYear: number;
  defaultYear: number;
} {
  const year = now.getFullYear();
  const month = now.getMonth(); // 0 = Jan
  // Sept–Dec: season in progress (year = calendar year)
  if (month >= 8) {
    return { currentYear: year, pastYear: year - 1, defaultYear: year };
  }
  // Jan–Feb: often playoffs / bowl for previous calendar season year - 1? 
  // ESPN uses start year: Jan 2026 playoffs still season 2025.
  if (month <= 1) {
    return { currentYear: year, pastYear: year - 1, defaultYear: year - 1 };
  }
  // Mar–Aug offseason
  return { currentYear: year, pastYear: year - 1, defaultYear: year - 1 };
}

export function resolveFootballStatsSeasonYear(now = new Date()): number {
  return resolveFootballHubSeasonYears(now).defaultYear;
}
