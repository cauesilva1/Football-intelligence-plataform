import { readSystemCache, writeSystemCache } from "@/lib/system-cache";
import { isStale, MATCH_SYNC_TTL_MS } from "@/lib/sync/data-staleness";

const ESPN_CORE = "https://sports.core.api.espn.com/v2/sports/soccer/leagues";

export type LeaderCategoryKey = "goals" | "assists" | "passes" | "yellowCards" | "redCards";

export interface CompetitionLeaderRow {
  rank: number;
  playerName: string;
  teamName: string;
  value: number;
  displayValue: string;
}

export interface CompetitionLeaders {
  goals: CompetitionLeaderRow[];
  assists: CompetitionLeaderRow[];
  passes: CompetitionLeaderRow[];
  yellowCards: CompetitionLeaderRow[];
  redCards: CompetitionLeaderRow[];
  seasonYear: number;
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

const CATEGORY_ALIASES: Record<LeaderCategoryKey, string[]> = {
  goals: ["goalsLeaders", "goals"],
  assists: ["assistsLeaders", "assists"],
  passes: ["accuratePasses", "totalPasses", "passes"],
  yellowCards: ["yellowCards", "yellowCard"],
  redCards: ["redCards", "redCard"],
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
        "User-Agent": "football-intelligence-platform/1.0 (espn-leaders)",
        Accept: "application/json",
      },
      next: { revalidate: 0 },
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
  cache: Map<string, string>
): Promise<string> {
  if (entry.athlete?.displayName) return entry.athlete.displayName;
  if (entry.athlete?.fullName) return entry.athlete.fullName;

  const id = extractIdFromRef(entry.athlete?.$ref);
  if (!id) return "—";
  if (cache.has(`a:${id}`)) return cache.get(`a:${id}`)!;

  const ref = entry.athlete?.$ref?.replace(/^http:/, "https:");
  if (!ref) return "—";
  const data = await fetchJson<{ displayName?: string; fullName?: string }>(ref);
  const name = data?.displayName ?? data?.fullName ?? "—";
  cache.set(`a:${id}`, name);
  return name;
}

async function resolveTeamName(
  entry: EspnLeaderEntry,
  cache: Map<string, string>
): Promise<string> {
  if (entry.team?.displayName) return entry.team.displayName;
  if (entry.team?.name) return entry.team.name;

  const id = extractIdFromRef(entry.team?.$ref);
  if (!id) return "—";
  if (cache.has(`t:${id}`)) return cache.get(`t:${id}`)!;

  const ref = entry.team?.$ref?.replace(/^http:/, "https:");
  if (!ref) return "—";
  const data = await fetchJson<{ displayName?: string; name?: string; abbreviation?: string }>(ref);
  const name = data?.displayName ?? data?.name ?? data?.abbreviation ?? "—";
  cache.set(`t:${id}`, name);
  return name;
}

function pickCategory(
  payload: EspnLeadersPayload,
  key: LeaderCategoryKey
): EspnLeaderEntry[] {
  const aliases = CATEGORY_ALIASES[key];
  for (const alias of aliases) {
    const found = payload.categories?.find((c) => c.name === alias);
    if (found?.leaders?.length) return found.leaders;
  }
  return [];
}

async function hydrateLeaders(
  entries: EspnLeaderEntry[],
  limit: number,
  nameCache: Map<string, string>
): Promise<CompetitionLeaderRow[]> {
  const slice = entries.slice(0, limit);
  const rows = await Promise.all(
    slice.map(async (entry, index) => {
      const [playerName, teamName] = await Promise.all([
        resolveAthleteName(entry, nameCache),
        resolveTeamName(entry, nameCache),
      ]);
      const value = Number(entry.value ?? 0);
      return {
        rank: index + 1,
        playerName,
        teamName,
        value: Number.isFinite(value) ? value : 0,
        displayValue: entry.shortDisplayValue ?? entry.displayValue ?? String(value),
      };
    })
  );
  return rows.filter((row) => row.playerName !== "—");
}

async function fetchLeadersForSeason(
  espnSlug: string,
  seasonYear: number,
  limit: number
): Promise<CompetitionLeaders | null> {
  const url = `${ESPN_CORE}/${espnSlug}/seasons/${seasonYear}/types/1/leaders?limit=${limit}`;
  const payload = await fetchJson<EspnLeadersPayload>(url);
  if (!payload?.categories?.length) return null;

  const nameCache = new Map<string, string>();
  const [goals, assists, passes, yellowCards, redCards] = await Promise.all([
    hydrateLeaders(pickCategory(payload, "goals"), limit, nameCache),
    hydrateLeaders(pickCategory(payload, "assists"), limit, nameCache),
    hydrateLeaders(pickCategory(payload, "passes"), limit, nameCache),
    hydrateLeaders(pickCategory(payload, "yellowCards"), limit, nameCache),
    hydrateLeaders(pickCategory(payload, "redCards"), limit, nameCache),
  ]);

  const hasAny =
    goals.length + assists.length + passes.length + yellowCards.length + redCards.length > 0;
  if (!hasAny) return null;

  return {
    goals,
    assists,
    passes,
    yellowCards,
    redCards,
    seasonYear,
    fetchedAt: new Date().toISOString(),
  };
}

/** Top scorers / passes / cards for an ESPN soccer league. */
export async function getEspnCompetitionLeaders(
  espnSlug: string,
  seasonYear: number,
  options: { limit?: number } = {}
): Promise<CompetitionLeaders | null> {
  const limit = options.limit ?? 10;
  const cacheKey = `espn:leaders:${espnSlug}:${seasonYear}:${limit}`;

  const cached = await readSystemCache<CompetitionLeaders>(cacheKey);
  if (cached?.fetchedAt && !isStale(new Date(cached.fetchedAt), MATCH_SYNC_TTL_MS)) {
    return cached;
  }

  const years = [seasonYear, seasonYear - 1].filter((y, i, arr) => arr.indexOf(y) === i);
  for (const year of years) {
    const leaders = await fetchLeadersForSeason(espnSlug, year, limit);
    if (leaders) {
      await writeSystemCache(cacheKey, leaders as object);
      return leaders;
    }
  }

  return cached ?? null;
}

export function emptyCompetitionLeaders(): CompetitionLeaders {
  return {
    goals: [],
    assists: [],
    passes: [],
    yellowCards: [],
    redCards: [],
    seasonYear: 0,
    fetchedAt: new Date().toISOString(),
  };
}
