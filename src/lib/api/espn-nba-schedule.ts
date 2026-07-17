import { readSystemCache, writeSystemCache } from "@/lib/system-cache";
import { isStale } from "@/lib/sync/data-staleness";

export type NbaGameStatus = "live" | "final" | "scheduled";
export type NbaCompetition = "nba" | "summer" | "ncaa";

export interface NbaGameLeader {
  name: string;
  points: number;
  rebounds: number;
  assists: number;
}

export interface NbaScheduleGame {
  id: string;
  name: string;
  homeTeam: string;
  awayTeam: string;
  homeAbbreviation: string;
  awayAbbreviation: string;
  homeLogo?: string;
  awayLogo?: string;
  homeScore: number;
  awayScore: number;
  status: NbaGameStatus;
  statusLabel: string;
  clock?: string;
  period?: number;
  startTime: string;
  competition: NbaCompetition;
  leaders?: {
    home: NbaGameLeader[];
    away: NbaGameLeader[];
  };
}

export interface NbaScheduleBundle {
  live: NbaScheduleGame[];
  past: NbaScheduleGame[];
  scheduled: NbaScheduleGame[];
  fetchedAt: string;
  notice?: string;
}

interface EspnCompetitor {
  homeAway?: "home" | "away";
  score?: string;
  team?: {
    displayName?: string;
    abbreviation?: string;
    logo?: string;
  };
}

interface EspnScoreboardEvent {
  id: string;
  name?: string;
  date?: string;
  status?: { type?: { name?: string; state?: string; completed?: boolean; shortDetail?: string } };
  competitions?: Array<{
    status?: {
      type?: { name?: string; state?: string; completed?: boolean; shortDetail?: string };
      displayClock?: string;
      period?: number;
    };
    competitors?: EspnCompetitor[];
  }>;
}

const NBA_LEAGUE_SLUGS = ["nba", "nba-summer"] as const;
const NCAA_ESPN_SLUG = "mens-college-basketball";
const SCHEDULE_TTL_MS = 2 * 60 * 1000;

function summaryUrl(competition: NbaCompetition): string {
  const league =
    competition === "summer"
      ? "nba-summer"
      : competition === "ncaa"
        ? NCAA_ESPN_SLUG
        : "nba";
  return `https://site.api.espn.com/apis/site/v2/sports/basketball/${league}/summary`;
}

function scoreboardUrl(espnSlug: string): string {
  return `https://site.api.espn.com/apis/site/v2/sports/basketball/${espnSlug}/scoreboard`;
}

function parseScore(value?: string): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function mapGameStatus(
  state?: string,
  name?: string,
  completed?: boolean
): { status: NbaGameStatus; label: string } {
  if (completed || state === "post" || name === "STATUS_FINAL") {
    return { status: "final", label: "Final" };
  }
  if (state === "in" || name === "STATUS_IN_PROGRESS") {
    return { status: "live", label: "Live" };
  }
  return { status: "scheduled", label: "Scheduled" };
}

function parseEvent(event: EspnScoreboardEvent, competition: NbaCompetition): NbaScheduleGame | null {
  const competitionBlock = event.competitions?.[0];
  const competitors = competitionBlock?.competitors ?? [];
  const home = competitors.find((team) => team.homeAway === "home");
  const away = competitors.find((team) => team.homeAway === "away");
  if (!home?.team?.displayName || !away?.team?.displayName) return null;

  const statusMeta = competitionBlock?.status?.type ?? event.status?.type;
  const mapped = mapGameStatus(statusMeta?.state, statusMeta?.name, statusMeta?.completed);

  return {
    id: event.id,
    name: event.name ?? `${away.team.displayName} @ ${home.team.displayName}`,
    homeTeam: home.team.displayName,
    awayTeam: away.team.displayName,
    homeAbbreviation: home.team.abbreviation ?? home.team.displayName.slice(0, 3).toUpperCase(),
    awayAbbreviation: away.team.abbreviation ?? away.team.displayName.slice(0, 3).toUpperCase(),
    homeLogo: home.team.logo,
    awayLogo: away.team.logo,
    homeScore: parseScore(home.score),
    awayScore: parseScore(away.score),
    status: mapped.status,
    statusLabel:
      mapped.status === "live"
        ? competitionBlock?.status?.type?.shortDetail ??
          `Q${competitionBlock?.status?.period ?? "?"} ${competitionBlock?.status?.displayClock ?? ""}`.trim()
        : mapped.label,
    clock: competitionBlock?.status?.displayClock,
    period: competitionBlock?.status?.period,
    startTime: event.date ?? new Date().toISOString(),
    competition,
  };
}

function shiftDate(base: Date, days: number): Date {
  const date = new Date(base);
  date.setDate(date.getDate() + days);
  return date;
}

function formatEspnDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

async function fetchScoreboardEvents(
  espnSlug: string,
  date: Date
): Promise<EspnScoreboardEvent[]> {
  const url = `${scoreboardUrl(espnSlug)}?dates=${formatEspnDate(date)}`;
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "football-intelligence-platform/1.0 (basketball-schedule)",
        Accept: "application/json",
      },
      next: { revalidate: 120 },
      signal: AbortSignal.timeout(45_000),
    });
    if (!response.ok) return [];
    const payload = (await response.json()) as { events?: EspnScoreboardEvent[] };
    return payload.events ?? [];
  } catch {
    return [];
  }
}

function bundleFromGames(
  games: NbaScheduleGame[],
  fetchedAt: string,
  notice?: string
): NbaScheduleBundle {
  const all = [...games].sort(
    (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
  );
  return {
    live: all.filter((game) => game.status === "live"),
    past: all.filter((game) => game.status === "final"),
    scheduled: all
      .filter((game) => game.status === "scheduled")
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()),
    fetchedAt,
    notice,
  };
}

function windowDateKeys(now: Date): string[] {
  const dates = [shiftDate(now, -2), shiftDate(now, -1), now, shiftDate(now, 1)];
  return [...new Set(dates.map((date) => formatEspnDate(date)))];
}

function dateFromKey(dateKey: string): Date {
  const year = Number.parseInt(dateKey.slice(0, 4), 10);
  const month = Number.parseInt(dateKey.slice(4, 6), 10) - 1;
  const day = Number.parseInt(dateKey.slice(6, 8), 10);
  return new Date(year, month, day);
}

/** Leitura pura da ESPN — sem escrita no banco (sync fica no cron). */
export async function fetchNbaScheduleBundle(now = new Date()): Promise<NbaScheduleBundle> {
  const dayKey = formatEspnDate(now);
  const cacheKey = `espn:schedule:nba:${dayKey}`;

  const cached = await readSystemCache<NbaScheduleBundle>(cacheKey);
  if (cached?.fetchedAt && !isStale(new Date(cached.fetchedAt), SCHEDULE_TTL_MS)) {
    return cached;
  }

  const dateKeys = windowDateKeys(now);
  const tasks = NBA_LEAGUE_SLUGS.flatMap((league) =>
    dateKeys.map(async (dateKey) => {
      const competition: NbaCompetition = league === "nba-summer" ? "summer" : "nba";
      const events = await fetchScoreboardEvents(league, dateFromKey(dateKey));
      return events
        .map((event) => parseEvent(event, competition))
        .filter((g): g is NbaScheduleGame => g != null)
        .map((g) => [`${competition}:${g.id}`, g] as const);
    })
  );

  const chunks = await Promise.all(tasks);
  const eventsByKey = new Map<string, NbaScheduleGame>();
  for (const pairs of chunks) {
    for (const [key, game] of pairs) eventsByKey.set(key, game);
  }

  const bundle = bundleFromGames([...eventsByKey.values()], now.toISOString());
  await writeSystemCache(cacheKey, bundle as object);
  return bundle;
}

/**
 * Agenda NCAA men's basketball.
 * No offseason, se a janela atual estiver vazia, carrega 1 dia showcase de março.
 */
export async function fetchNcaaScheduleBundle(now = new Date()): Promise<NbaScheduleBundle> {
  const ncaaStarted = now >= new Date(Date.UTC(2026, 10, 1));
  const dayKey = formatEspnDate(now);
  const cacheKey = `espn:schedule:ncaa:${dayKey}`;

  const cached = await readSystemCache<NbaScheduleBundle>(cacheKey);
  if (cached?.fetchedAt && !isStale(new Date(cached.fetchedAt), SCHEDULE_TTL_MS)) {
    return cached;
  }

  const dateKeys = windowDateKeys(now);
  const chunks = await Promise.all(
    dateKeys.map(async (dateKey) => {
      const events = await fetchScoreboardEvents(NCAA_ESPN_SLUG, dateFromKey(dateKey));
      return events
        .map((event) => parseEvent(event, "ncaa"))
        .filter((g): g is NbaScheduleGame => g != null)
        .map((g) => [`ncaa:${g.id}`, g] as const);
    })
  );

  const eventsByKey = new Map<string, NbaScheduleGame>();
  for (const pairs of chunks) {
    for (const [key, game] of pairs) eventsByKey.set(key, game);
  }

  let notice: string | undefined;
  if (eventsByKey.size === 0 && !ncaaStarted) {
    const seasonEndYear = now.getMonth() < 9 ? now.getFullYear() : now.getFullYear() + 1;
    // Single showcase day (March 15) — enough for offseason demo without 4 round-trips
    const showcaseKey = formatEspnDate(new Date(Date.UTC(seasonEndYear, 2, 15)));
    const events = await fetchScoreboardEvents(NCAA_ESPN_SLUG, dateFromKey(showcaseKey));
    for (const event of events) {
      const parsed = parseEvent(event, "ncaa");
      if (parsed) eventsByKey.set(`ncaa:${parsed.id}`, parsed);
    }
    if (eventsByKey.size > 0) {
      notice = `Offseason · March ${seasonEndYear - 1}/${String(seasonEndYear).slice(-2)} sample games`;
    }
  }

  const bundle = bundleFromGames([...eventsByKey.values()], now.toISOString(), notice);
  await writeSystemCache(cacheKey, bundle as object);
  return bundle;
}

export async function fetchNbaGameLeaders(
  eventId: string,
  competition: NbaCompetition = "nba"
): Promise<NbaScheduleGame["leaders"]> {
  const response = await fetch(`${summaryUrl(competition)}?event=${eventId}`, {
    headers: {
      "User-Agent": "football-intelligence-platform/1.0 (nba-schedule-ui)",
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(45_000),
  });

  if (!response.ok) return undefined;

  const payload = (await response.json()) as {
    boxscore?: {
      players?: Array<{
        team?: { homeAway?: string };
        statistics?: Array<{
          athletes?: Array<{
            athlete?: { displayName?: string };
            stats?: string[];
          }>;
        }>;
      }>;
    };
  };

  const leaders: NonNullable<NbaScheduleGame["leaders"]> = { home: [], away: [] };

  for (const teamBlock of payload.boxscore?.players ?? []) {
    const side = teamBlock.team?.homeAway === "home" ? "home" : "away";
    const athletes = teamBlock.statistics?.[0]?.athletes ?? [];

    const parsed = athletes
      .map((entry) => ({
        name: entry.athlete?.displayName ?? "Unknown",
        points: Number.parseInt(entry.stats?.[1] ?? "0", 10) || 0,
        rebounds: Number.parseInt(entry.stats?.[5] ?? "0", 10) || 0,
        assists: Number.parseInt(entry.stats?.[6] ?? "0", 10) || 0,
      }))
      .filter((row) => row.points > 0 || row.rebounds > 0 || row.assists > 0)
      .sort((a, b) => b.points - a.points)
      .slice(0, 3);

    leaders[side] = parsed;
  }

  return leaders;
}

export function formatNbaGameDate(iso: string, timeZone?: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  });
}
