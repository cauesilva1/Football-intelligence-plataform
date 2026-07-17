import { readSystemCache, writeSystemCache } from "@/lib/system-cache";
import { isStale, MATCH_SYNC_TTL_MS } from "@/lib/sync/data-staleness";

const ESPN_CORE = "https://sports.core.api.espn.com/v2/sports/basketball/leagues";

export type NbaLeaderCategoryKey =
  | "points"
  | "rebounds"
  | "assists"
  | "steals"
  | "blocks";

export interface NbaLeaderRow {
  rank: number;
  playerName: string;
  teamName: string;
  value: number;
  displayValue: string;
}

export interface NbaCompetitionLeaders {
  points: NbaLeaderRow[];
  rebounds: NbaLeaderRow[];
  assists: NbaLeaderRow[];
  steals: NbaLeaderRow[];
  blocks: NbaLeaderRow[];
  seasonYear: number;
  seasonLabel: string;
  fetchedAt: string;
}

interface EspnLeaderEntry {
  value?: number;
  displayValue?: string;
  shortDisplayValue?: string;
  athlete?: { $ref?: string; displayName?: string; fullName?: string };
  team?: { $ref?: string; displayName?: string; name?: string };
}

interface EspnLeadersPayload {
  categories?: Array<{
    name?: string;
    displayName?: string;
    leaders?: EspnLeaderEntry[];
  }>;
}

const CATEGORY_ALIASES: Record<NbaLeaderCategoryKey, string[]> = {
  points: ["pointsPerGame", "points"],
  rebounds: ["reboundsPerGame", "rebounds"],
  assists: ["assistsPerGame", "assists"],
  steals: ["stealsPerGame", "steals"],
  blocks: ["blocksPerGame", "blocks"],
};

/** ESPN season year = campaign end year (2025-26 → 2026). Offseason shows last completed. */
export function resolveNbaStatsSeasonYear(now = new Date()): number {
  const year = now.getFullYear();
  const month = now.getMonth(); // 0 = Jan
  // Oct–Dec: new campaign (e.g. Oct 2026 → season year 2027)
  if (month >= 9) return year + 1;
  return year;
}

export function nbaSeasonLabel(seasonYear: number): string {
  return `${seasonYear - 1}/${String(seasonYear).slice(-2)}`;
}

/** Past + current/upcoming ESPN season years for hub toggles. */
export function resolveNbaHubSeasonYears(now = new Date()): {
  currentYear: number;
  pastYear: number;
  defaultYear: number;
} {
  const month = now.getMonth();
  // Before October: "current" is the upcoming campaign; default to last completed if empty.
  if (month < 9) {
    const pastYear = now.getFullYear(); // Jul 2026 → 2026 = 2025/26
    const currentYear = pastYear + 1; // 2027 = 2026/27
    return { currentYear, pastYear, defaultYear: pastYear };
  }
  const currentYear = now.getFullYear() + 1;
  return { currentYear, pastYear: currentYear - 1, defaultYear: currentYear };
}

function extractIdFromRef(ref?: string): string | null {
  if (!ref) return null;
  const match = /\/(?:athletes|teams)\/(\d+)/.exec(ref);
  return match?.[1] ?? null;
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "football-intelligence-platform/1.0 (nba-leaders)",
        Accept: "application/json",
      },
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

async function resolveAthleteName(
  entry: EspnLeaderEntry,
  cache: Map<string, string>,
  allowFetch: boolean
): Promise<string> {
  if (entry.athlete?.displayName) return entry.athlete.displayName;
  if (entry.athlete?.fullName) return entry.athlete.fullName;

  const id = extractIdFromRef(entry.athlete?.$ref);
  if (!id) return "—";
  if (cache.has(`a:${id}`)) return cache.get(`a:${id}`)!;

  if (!allowFetch) {
    cache.set(`a:${id}`, "—");
    return "—";
  }

  const ref = entry.athlete?.$ref?.replace(/^http:/, "https:");
  if (!ref) return "—";
  const data = await fetchJson<{ displayName?: string; fullName?: string }>(ref);
  const name = data?.displayName ?? data?.fullName ?? "—";
  cache.set(`a:${id}`, name);
  return name;
}

async function resolveTeamName(
  entry: EspnLeaderEntry,
  cache: Map<string, string>,
  allowFetch: boolean
): Promise<string> {
  if (entry.team?.displayName) return entry.team.displayName;
  if (entry.team?.name) return entry.team.name;

  const id = extractIdFromRef(entry.team?.$ref);
  if (!id) return "—";
  if (cache.has(`t:${id}`)) return cache.get(`t:${id}`)!;

  if (!allowFetch) {
    cache.set(`t:${id}`, "—");
    return "—";
  }

  const ref = entry.team?.$ref?.replace(/^http:/, "https:");
  if (!ref) return "—";
  const data = await fetchJson<{ displayName?: string; name?: string; abbreviation?: string }>(
    ref
  );
  const name = data?.displayName ?? data?.name ?? data?.abbreviation ?? "—";
  cache.set(`t:${id}`, name);
  return name;
}

function pickCategory(
  payload: EspnLeadersPayload,
  key: NbaLeaderCategoryKey
): EspnLeaderEntry[] {
  for (const alias of CATEGORY_ALIASES[key]) {
    const found = payload.categories?.find((c) => c.name === alias);
    if (found?.leaders?.length) return found.leaders;
  }
  return [];
}

async function hydrateLeaders(
  entries: EspnLeaderEntry[],
  limit: number,
  nameCache: Map<string, string>,
  fetchBudget: { remaining: number }
): Promise<NbaLeaderRow[]> {
  const slice = entries.slice(0, limit);
  const rows = await Promise.all(
    slice.map(async (entry, index) => {
      const needsAthleteFetch =
        !entry.athlete?.displayName && !entry.athlete?.fullName && Boolean(entry.athlete?.$ref);
      const needsTeamFetch =
        !entry.team?.displayName && !entry.team?.name && Boolean(entry.team?.$ref);
      const allowAthlete = needsAthleteFetch && fetchBudget.remaining > 0;
      if (allowAthlete) fetchBudget.remaining -= 1;
      const allowTeam = needsTeamFetch && fetchBudget.remaining > 0;
      if (allowTeam) fetchBudget.remaining -= 1;

      const [playerName, teamName] = await Promise.all([
        resolveAthleteName(entry, nameCache, allowAthlete),
        resolveTeamName(entry, nameCache, allowTeam),
      ]);
      const value = Number(entry.value ?? 0);
      return {
        rank: index + 1,
        playerName,
        teamName,
        value: Number.isFinite(value) ? Number(value.toFixed(1)) : 0,
        displayValue: entry.displayValue ?? entry.shortDisplayValue ?? String(value),
      };
    })
  );
  // Keep rows with values even if name unresolved (budget exhausted).
  return rows.filter((row) => row.value > 0 || row.playerName !== "—");
}

export function emptyNbaCompetitionLeaders(
  seasonYear = resolveNbaStatsSeasonYear()
): NbaCompetitionLeaders {
  return {
    points: [],
    rebounds: [],
    assists: [],
    steals: [],
    blocks: [],
    seasonYear,
    seasonLabel: nbaSeasonLabel(seasonYear),
    fetchedAt: new Date().toISOString(),
  };
}

type BasketballLeadersLeague = "nba" | "mens-college-basketball";

async function getBasketballCompetitionLeaders(
  league: BasketballLeadersLeague,
  options: { limit?: number; seasonYear?: number } = {}
): Promise<NbaCompetitionLeaders> {
  const limit = options.limit ?? 10;
  const seasonYear = options.seasonYear ?? resolveNbaStatsSeasonYear();
  const cacheKey = `espn:${league}-leaders:${seasonYear}:${limit}`;

  const cached = await readSystemCache<NbaCompetitionLeaders>(cacheKey);
  if (cached?.fetchedAt && !isStale(new Date(cached.fetchedAt), MATCH_SYNC_TTL_MS)) {
    return cached;
  }

  // type 2 = regular season (type 1 empty in offseason probes)
  const url = `${ESPN_CORE}/${league}/seasons/${seasonYear}/types/2/leaders?limit=${limit}`;
  const payload = await fetchJson<EspnLeadersPayload>(url);
  if (!payload?.categories?.length) {
    return cached ?? emptyNbaCompetitionLeaders(seasonYear);
  }

  const nameCache = new Map<string, string>();
  // Cap $ref hydration (~10 athletes + teams) so cold hub stays fast.
  const fetchBudget = { remaining: 20 };
  const [points, rebounds, assists, steals, blocks] = await Promise.all([
    hydrateLeaders(pickCategory(payload, "points"), limit, nameCache, fetchBudget),
    hydrateLeaders(pickCategory(payload, "rebounds"), limit, nameCache, fetchBudget),
    hydrateLeaders(pickCategory(payload, "assists"), limit, nameCache, fetchBudget),
    hydrateLeaders(pickCategory(payload, "steals"), limit, nameCache, fetchBudget),
    hydrateLeaders(pickCategory(payload, "blocks"), limit, nameCache, fetchBudget),
  ]);

  const result: NbaCompetitionLeaders = {
    points,
    rebounds,
    assists,
    steals,
    blocks,
    seasonYear,
    seasonLabel: nbaSeasonLabel(seasonYear),
    fetchedAt: new Date().toISOString(),
  };

  await writeSystemCache(cacheKey, result as object);
  return result;
}

/** PPG / RPG / APG / SPG / BPG leaders for NBA regular season. */
export async function getNbaCompetitionLeaders(
  options: { limit?: number; seasonYear?: number } = {}
): Promise<NbaCompetitionLeaders> {
  return getBasketballCompetitionLeaders("nba", options);
}

/** Same categories for NCAA men's basketball. */
export async function getNcaaCompetitionLeaders(
  options: { limit?: number; seasonYear?: number } = {}
): Promise<NbaCompetitionLeaders> {
  return getBasketballCompetitionLeaders("mens-college-basketball", options);
}
