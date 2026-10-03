/**
 * API-Basketball (API-Sports) client. Its own 100 req/day quota, separate from API-Football.
 * Paid calls are reserved for gaps the free sources cannot cover — today only the
 * EuroLeague outage check in `checkEuroLeagueOutage`.
 */
import { ApiQuotaTracker, formatQuotaLog, parseRateLimitHeaders } from "@/lib/api-quota";
import { resolveEuroLeagueSeason } from "@/lib/basketball/season";
import { canUseDatabase, readSystemCache, writeSystemCache } from "@/lib/system-cache";

const API_BASE = "https://v1.basketball.api-sports.io";
const LOG = "[api-basketball]";
/** API-Basketball league id for the EuroLeague; verified against `league.name` in responses. */
export const API_BASKETBALL_EUROLEAGUE_ID = 120;

let basketballQuota = new ApiQuotaTracker("basketball");

function quotaCacheKey(): string {
  return `api-sports:basketball:quota:${new Date().toISOString().slice(0, 10)}`;
}

export function getBasketballQuotaTracker(): ApiQuotaTracker {
  return basketballQuota;
}

/** Start a fresh per-run tracker seeded with the remaining quota persisted earlier today. */
export async function startBasketballQuotaRun(): Promise<ApiQuotaTracker> {
  basketballQuota = new ApiQuotaTracker("basketball");
  if (canUseDatabase()) {
    const persisted = await readSystemCache<{ remaining?: number }>(quotaCacheKey());
    if (typeof persisted?.remaining === "number") basketballQuota.seedRemaining(persisted.remaining);
  }
  return basketballQuota;
}

async function persistRemaining(): Promise<void> {
  if (!canUseDatabase()) return;
  try {
    await writeSystemCache(quotaCacheKey(), {
      remaining: basketballQuota.remaining,
      updatedAt: new Date().toISOString(),
    });
  } catch {
    // Best effort — the provider header stays authoritative on the next call.
  }
}

type ApiEnvelope<T> = { response?: T; errors?: unknown };

function hasApiErrors(errors: unknown): boolean {
  if (Array.isArray(errors)) return errors.length > 0;
  if (errors && typeof errors === "object") return Object.keys(errors).length > 0;
  return false;
}

/** One quota-gated GET. Returns null (never throws) when skipped or failed. */
export async function fetchApiBasketball<T>(
  endpoint: string,
  params: Record<string, string | number>
): Promise<T | null> {
  const apiKey = process.env.APISPORTS_BASKETBALL_KEY?.trim();
  if (!apiKey) {
    basketballQuota.recordSkip("APISPORTS_BASKETBALL_KEY not set");
    console.warn(`${LOG} APISPORTS_BASKETBALL_KEY not set — paid call skipped.`);
    return null;
  }

  if (!basketballQuota.canSpend(1)) {
    basketballQuota.recordSkip("fewer than the minimum API-Basketball calls remain");
    console.warn(
      `${LOG} skipped ${endpoint} — quota low (remaining ${basketballQuota.remaining}, floor ${basketballQuota.minRemaining}).`
    );
    return null;
  }

  const url = new URL(`${API_BASE}${endpoint}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value));

  let response: Response;
  try {
    response = await fetch(url, {
      headers: { "x-apisports-key": apiKey },
      signal: AbortSignal.timeout(20_000),
      cache: "no-store",
    });
  } catch (error) {
    console.warn(`${LOG} network error on ${endpoint}:`, error instanceof Error ? error.message : error);
    return null;
  }

  basketballQuota.recordCall(response.headers);
  const rate = parseRateLimitHeaders(response.headers);
  console.log(`${LOG} ${endpoint} → ${formatQuotaLog(basketballQuota.snapshot())}`);
  await persistRemaining();

  if (!response.ok) {
    console.warn(`${LOG} HTTP ${response.status} on ${endpoint}${rate.remaining === 0 ? " (quota exhausted)" : ""}`);
    return null;
  }

  const payload = (await response.json()) as ApiEnvelope<T>;
  if (hasApiErrors(payload.errors)) {
    console.warn(`${LOG} API error on ${endpoint}:`, JSON.stringify(payload.errors));
    return null;
  }

  return payload.response ?? null;
}

// ── EuroLeague outage check ──────────────────────────────────────────────

export type ApiBasketballGame = {
  id?: number;
  date?: string;
  status?: { short?: string };
  league?: { id?: number; name?: string };
  teams?: { home?: { name?: string }; away?: { name?: string } };
  scores?: { home?: { total?: number | null }; away?: { total?: number | null } };
};

export type EuroLeagueFallbackGame = {
  date: string;
  home: string;
  away: string;
  homeScore: number | null;
  awayScore: number | null;
};

export type EuroLeagueOutageReport = {
  reason: string;
  datesChecked: string[];
  finishedGames: number;
  games: EuroLeagueFallbackGame[];
  note: string;
  skipped?: string;
};

const FINISHED_STATUSES = new Set(["FT", "AOT"]);

/** 202627 → "2026-2027" (API-Basketball season format). */
export function apiBasketballSeason(seasonKey: number): string {
  const startYear = Math.floor(seasonKey / 100);
  return `${startYear}-${startYear + 1}`;
}

/** Keeps finished EuroLeague games only; tolerant of missing fields, never throws. */
export function parseFinishedEuroLeagueGames(response: unknown): EuroLeagueFallbackGame[] {
  if (!Array.isArray(response)) return [];
  const games: EuroLeagueFallbackGame[] = [];

  for (const raw of response as ApiBasketballGame[]) {
    if (!raw || typeof raw !== "object") continue;
    const leagueName = raw.league?.name?.toLowerCase() ?? "";
    const isEuroLeague =
      raw.league?.id === API_BASKETBALL_EUROLEAGUE_ID || leagueName.includes("euroleague");
    if (!isEuroLeague) continue;
    if (!FINISHED_STATUSES.has(raw.status?.short ?? "")) continue;

    const home = raw.teams?.home?.name?.trim();
    const away = raw.teams?.away?.name?.trim();
    if (!home || !away || !raw.date) continue;

    games.push({
      date: raw.date,
      home,
      away,
      homeScore: typeof raw.scores?.home?.total === "number" ? raw.scores.home.total : null,
      awayScore: typeof raw.scores?.away?.total === "number" ? raw.scores.away.total : null,
    });
  }

  return games;
}

/**
 * Only runs when the official EuroLeague API failed. Spends at most one call per day in
 * the window (default 2) to learn whether games were actually played, so the run reports
 * the size of the backlog the automatic catch-up will recover. It does not write stats:
 * player lines stay owned by the official feed, which avoids double-counting averages.
 */
export async function checkEuroLeagueOutage(options: {
  reason: string;
  now?: Date;
  days?: number;
}): Promise<EuroLeagueOutageReport> {
  const now = options.now ?? new Date();
  const days = Math.max(1, Math.min(options.days ?? 2, 3));
  const { year } = resolveEuroLeagueSeason(now);
  const season = apiBasketballSeason(year);

  const report: EuroLeagueOutageReport = {
    reason: options.reason,
    datesChecked: [],
    finishedGames: 0,
    games: [],
    note: "Official EuroLeague API unavailable; boxscores are recovered automatically by the next successful run.",
  };

  if (!process.env.APISPORTS_BASKETBALL_KEY?.trim()) {
    basketballQuota.recordSkip("APISPORTS_BASKETBALL_KEY not set");
    report.skipped = "no-api-key";
    console.warn(`${LOG} outage check skipped — APISPORTS_BASKETBALL_KEY not set.`);
    return report;
  }

  for (let offset = 0; offset < days; offset += 1) {
    const day = new Date(now);
    day.setUTCDate(day.getUTCDate() - offset);
    const date = day.toISOString().slice(0, 10);

    if (!basketballQuota.canSpend(1)) {
      report.skipped = "quota-low-or-key-missing";
      break;
    }

    const response = await fetchApiBasketball<unknown>("/games", {
      league: API_BASKETBALL_EUROLEAGUE_ID,
      season,
      date,
    });
    if (response === null) {
      report.skipped = report.skipped ?? "request-skipped-or-failed";
      continue;
    }

    report.datesChecked.push(date);
    report.games.push(...parseFinishedEuroLeagueGames(response));
  }

  report.finishedGames = report.games.length;
  return report;
}
