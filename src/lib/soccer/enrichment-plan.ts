/**
 * Which leagues get the daily API-Football quota. Leagues that are in season and
 * "core" are served first with an even split; everything else shares one rotating
 * slot per day so no league is starved across the week. Pure and deterministic.
 */
export type LeagueTier = "core" | "rotation";

export interface LeagueProfile {
  /** Lower number = served first among core leagues. */
  priority: number;
  /** Core leagues are prioritised while in season; others rotate. */
  core: boolean;
  /** UTC months (0 = January) in which the league plays. */
  months: readonly number[];
}

const EUROPE_DOMESTIC_MONTHS = [7, 8, 9, 10, 11, 0, 1, 2, 3, 4] as const; // Aug–May
const UCL_MONTHS = [8, 9, 10, 11, 0, 1, 2, 3, 4] as const; // Sep–May
const CALENDAR_YEAR_MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const; // Feb–Dec
const CONMEBOL_MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const; // Feb–Nov

const LEAGUE_RULES: Array<{ needles: string[]; profile: LeagueProfile }> = [
  // Order matters: Brazilian labels contain "serie a" substrings after normalisation.
  { needles: ["brasileir"], profile: { priority: 7, core: true, months: CALENDAR_YEAR_MONTHS } },
  { needles: ["copa do brasil"], profile: { priority: 20, core: false, months: CONMEBOL_MONTHS } },
  { needles: ["libertadores"], profile: { priority: 21, core: false, months: CONMEBOL_MONTHS } },
  { needles: ["sudamericana"], profile: { priority: 22, core: false, months: CONMEBOL_MONTHS } },
  // Before "premier league" — "Canadian Premier League" contains that phrase.
  { needles: ["canadian premier"], profile: { priority: 90, core: false, months: [] } },
  { needles: ["premier league"], profile: { priority: 1, core: true, months: EUROPE_DOMESTIC_MONTHS } },
  { needles: ["la liga"], profile: { priority: 2, core: true, months: EUROPE_DOMESTIC_MONTHS } },
  { needles: ["serie a"], profile: { priority: 3, core: true, months: EUROPE_DOMESTIC_MONTHS } },
  { needles: ["bundesliga"], profile: { priority: 4, core: true, months: EUROPE_DOMESTIC_MONTHS } },
  { needles: ["ligue 1"], profile: { priority: 5, core: true, months: EUROPE_DOMESTIC_MONTHS } },
  { needles: ["champions league"], profile: { priority: 6, core: true, months: UCL_MONTHS } },
  { needles: ["mls", "major league soccer"], profile: { priority: 8, core: true, months: CALENDAR_YEAR_MONTHS } },
];

const UNKNOWN_PROFILE: LeagueProfile = { priority: 99, core: false, months: [] };

function normalizeLabel(label: string): string {
  return label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function leagueProfile(label: string): LeagueProfile {
  const normalized = normalizeLabel(label);
  for (const rule of LEAGUE_RULES) {
    if (rule.needles.some((needle) => normalized.includes(needle))) return rule.profile;
  }
  return UNKNOWN_PROFILE;
}

export function isLeagueInSeason(label: string, now: Date): boolean {
  return leagueProfile(label).months.includes(now.getUTCMonth());
}

/** Core league that is playing right now — served first, every day. */
export function isCoreInSeason(label: string, now: Date): boolean {
  const profile = leagueProfile(label);
  return profile.core && profile.months.includes(now.getUTCMonth());
}

export interface EnrichmentPlanEntry {
  league: string;
  tier: LeagueTier;
  inSeason: boolean;
  /** API calls this league may spend (unused budget is carried to the next entry). */
  budget: number;
}

export interface EnrichmentPlanInput {
  /** Leagues that currently have rows to enrich. */
  leagues: string[];
  now: Date;
  /** Calls available to spend today (already net of the minimum-remaining floor). */
  usableCalls: number;
  /** Share of the budget reserved for the rotating slot when core leagues exist. */
  rotationShare?: number;
  /** Floor for the rotating slot's budget. */
  rotationMinCalls?: number;
}

export function rotationOffset(now: Date, size: number): number {
  if (size <= 0) return 0;
  const dayNumber = Math.floor(now.getTime() / 86_400_000);
  return dayNumber % size;
}

function splitEvenly(total: number, parts: number): number[] {
  if (parts <= 0) return [];
  const base = Math.floor(total / parts);
  const remainder = total - base * parts;
  return Array.from({ length: parts }, (_, i) => base + (i < remainder ? 1 : 0));
}

export function buildEnrichmentPlan(input: EnrichmentPlanInput): EnrichmentPlanEntry[] {
  const usable = Math.max(0, Math.floor(input.usableCalls));
  if (usable === 0) return [];

  const unique = [...new Set(input.leagues)];
  const core = unique
    .filter((league) => isCoreInSeason(league, input.now))
    .sort((a, b) => leagueProfile(a).priority - leagueProfile(b).priority || a.localeCompare(b));
  const others = unique
    .filter((league) => !isCoreInSeason(league, input.now))
    .sort((a, b) => a.localeCompare(b));

  const offset = rotationOffset(input.now, others.length);
  const rotated = others.length ? [...others.slice(offset), ...others.slice(0, offset)] : [];

  if (core.length === 0) {
    const budgets = splitEvenly(usable, rotated.length);
    return rotated.map((league, i) => ({
      league,
      tier: "rotation" as const,
      inSeason: isLeagueInSeason(league, input.now),
      budget: budgets[i],
    }));
  }

  const share = input.rotationShare ?? 0.2;
  const minCalls = input.rotationMinCalls ?? 6;
  const rotationBudget = rotated.length
    ? Math.min(usable, Math.max(minCalls, Math.floor(usable * share)))
    : 0;
  const coreBudgets = splitEvenly(usable - rotationBudget, core.length);

  const entries: EnrichmentPlanEntry[] = core.map((league, i) => ({
    league,
    tier: "core" as const,
    inSeason: true,
    budget: coreBudgets[i],
  }));

  if (rotated.length) {
    entries.push({
      league: rotated[0],
      tier: "rotation",
      inSeason: isLeagueInSeason(rotated[0], input.now),
      budget: rotationBudget,
    });
  }

  return entries;
}

export interface LeagueRunSummary {
  league: string;
  tier: LeagueTier;
  inSeason: boolean;
  budget: number;
  spent: number;
  updated: number;
}
