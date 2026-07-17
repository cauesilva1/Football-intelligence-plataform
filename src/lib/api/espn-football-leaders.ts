import { readSystemCache, writeSystemCache } from "@/lib/system-cache";
import { isStale, MATCH_SYNC_TTL_MS } from "@/lib/sync/data-staleness";
import {
  footballSeasonLabel,
  resolveFootballStatsSeasonYear,
} from "@/lib/api/espn-football-seasons";

const ESPN_CORE = "https://sports.core.api.espn.com/v2/sports/football/leagues";

export type FootballLeaderCategoryKey =
  | "passingYards"
  | "rushingYards"
  | "receivingYards"
  | "sacks"
  | "tackles";

export interface FootballLeaderRow {
  rank: number;
  playerName: string;
  teamName: string;
  value: number;
  displayValue: string;
}

export interface FootballCompetitionLeaders {
  passingYards: FootballLeaderRow[];
  rushingYards: FootballLeaderRow[];
  receivingYards: FootballLeaderRow[];
  sacks: FootballLeaderRow[];
  tackles: FootballLeaderRow[];
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

const CATEGORY_ALIASES: Record<FootballLeaderCategoryKey, string[]> = {
  passingYards: ["passingYards", "passingYardsPerGame"],
  rushingYards: ["rushingYards", "rushingYardsPerGame"],
  receivingYards: ["receivingYards", "receivingYardsPerGame"],
  sacks: ["sacks", "sacksPerGame"],
  tackles: ["totalTackles", "tackles", "soloTackles"],
};

function extractIdFromRef(ref?: string): string | null {
  if (!ref) return null;
  const match = /\/(?:athletes|teams)\/(\d+)/.exec(ref);
  return match?.[1] ?? null;
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "football-intelligence-platform/1.0 (football-leaders)",
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
  key: FootballLeaderCategoryKey
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
): Promise<FootballLeaderRow[]> {
  const slice = entries.slice(0, limit);
  const rows = await Promise.all(
    slice.map(async (entry, index) => {
      const allowFetch = fetchBudget.remaining > 0;
      if (allowFetch) fetchBudget.remaining -= 1;
      const [playerName, teamName] = await Promise.all([
        resolveAthleteName(entry, nameCache, allowFetch),
        resolveTeamName(entry, nameCache, allowFetch),
      ]);
      const value = Number.isFinite(entry.value) ? Number(entry.value) : 0;
      return {
        rank: index + 1,
        playerName,
        teamName,
        value,
        displayValue: entry.displayValue ?? entry.shortDisplayValue ?? String(value),
      };
    })
  );
  return rows;
}

export function emptyFootballCompetitionLeaders(
  seasonYear: number
): FootballCompetitionLeaders {
  return {
    passingYards: [],
    rushingYards: [],
    receivingYards: [],
    sacks: [],
    tackles: [],
    seasonYear,
    seasonLabel: footballSeasonLabel(seasonYear),
    fetchedAt: new Date().toISOString(),
  };
}

async function getFootballLeaders(
  leagueSlug: "nfl" | "college-football",
  cachePrefix: string,
  options?: { limit?: number; seasonYear?: number }
): Promise<FootballCompetitionLeaders> {
  const limit = options?.limit ?? 10;
  const seasonYear = options?.seasonYear ?? resolveFootballStatsSeasonYear();
  const seasonLabel = footballSeasonLabel(seasonYear);
  const cacheKey = `${cachePrefix}:${seasonYear}:l${limit}`;

  const cached = await readSystemCache<FootballCompetitionLeaders>(cacheKey);
  if (cached && !isStale(new Date(cached.fetchedAt), MATCH_SYNC_TTL_MS)) {
    return cached;
  }

  const url = `${ESPN_CORE}/${leagueSlug}/leaders?season=${seasonYear}&limit=50`;
  const payload = await fetchJson<EspnLeadersPayload>(url);
  if (!payload?.categories?.length) {
    return emptyFootballCompetitionLeaders(seasonYear);
  }

  const nameCache = new Map<string, string>();
  const fetchBudget = { remaining: 20 };
  const keys: FootballLeaderCategoryKey[] = [
    "passingYards",
    "rushingYards",
    "receivingYards",
    "sacks",
    "tackles",
  ];

  const result = emptyFootballCompetitionLeaders(seasonYear);
  result.seasonLabel = seasonLabel;
  result.fetchedAt = new Date().toISOString();

  for (const key of keys) {
    result[key] = await hydrateLeaders(
      pickCategory(payload, key),
      limit,
      nameCache,
      fetchBudget
    );
  }

  await writeSystemCache(cacheKey, result as object);
  return result;
}

export async function getNflCompetitionLeaders(options?: {
  limit?: number;
  seasonYear?: number;
}): Promise<FootballCompetitionLeaders> {
  return getFootballLeaders("nfl", "espn:leaders:nfl", options);
}

export async function getCfbCompetitionLeaders(options?: {
  limit?: number;
  seasonYear?: number;
}): Promise<FootballCompetitionLeaders> {
  return getFootballLeaders("college-football", "espn:leaders:cfb", options);
}
