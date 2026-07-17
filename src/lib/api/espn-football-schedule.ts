import { readSystemCache, writeSystemCache } from "@/lib/system-cache";
import { isStale } from "@/lib/sync/data-staleness";
import type {
  NbaScheduleBundle,
  NbaScheduleGame,
  NbaGameStatus,
} from "@/lib/api/espn-nba-schedule";

export type FootballScheduleGame = Omit<NbaScheduleGame, "competition"> & {
  competition: "nfl" | "cfb";
};

export type FootballScheduleBundle = Omit<NbaScheduleBundle, "live" | "past" | "scheduled"> & {
  live: FootballScheduleGame[];
  past: FootballScheduleGame[];
  scheduled: FootballScheduleGame[];
};

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

const SCHEDULE_TTL_MS = 2 * 60 * 1000;

function scoreboardUrl(espnSlug: string): string {
  return `https://site.api.espn.com/apis/site/v2/sports/football/${espnSlug}/scoreboard`;
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

function mapEvent(
  event: EspnScoreboardEvent,
  competition: "nfl" | "cfb"
): FootballScheduleGame | null {
  const comp = event.competitions?.[0];
  const competitors = comp?.competitors ?? [];
  const home = competitors.find((c) => c.homeAway === "home");
  const away = competitors.find((c) => c.homeAway === "away");
  if (!home?.team || !away?.team) return null;

  const statusSource = comp?.status?.type ?? event.status?.type;
  const mapped = mapGameStatus(
    statusSource?.state,
    statusSource?.name,
    statusSource?.completed
  );

  return {
    id: event.id,
    name: event.name ?? `${away.team.displayName} @ ${home.team.displayName}`,
    homeTeam: home.team.displayName ?? "Home",
    awayTeam: away.team.displayName ?? "Away",
    homeAbbreviation: home.team.abbreviation ?? "HOM",
    awayAbbreviation: away.team.abbreviation ?? "AWY",
    homeLogo: home.team.logo,
    awayLogo: away.team.logo,
    homeScore: parseScore(home.score),
    awayScore: parseScore(away.score),
    status: mapped.status,
    statusLabel: statusSource?.shortDetail ?? mapped.label,
    clock: comp?.status?.displayClock,
    period: comp?.status?.period,
    startTime: event.date ?? new Date().toISOString(),
    competition,
  };
}

async function fetchScoreboardBundle(
  espnSlug: string,
  competition: "nfl" | "cfb",
  cacheKey: string
): Promise<FootballScheduleBundle> {
  const cached = await readSystemCache<FootballScheduleBundle & { cachedAt: string }>(cacheKey);
  if (cached && !isStale(new Date(cached.cachedAt), SCHEDULE_TTL_MS)) {
    return cached;
  }

  try {
    const response = await fetch(scoreboardUrl(espnSlug), {
      headers: {
        "User-Agent": "football-intelligence-platform/1.0 (football-schedule)",
        Accept: "application/json",
      },
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) {
      return emptyBundle();
    }

    const data = (await response.json()) as { events?: EspnScoreboardEvent[] };
    const games = (data.events ?? [])
      .map((event) => mapEvent(event, competition))
      .filter((g): g is FootballScheduleGame => g != null);

    const bundle: FootballScheduleBundle & { cachedAt: string } = {
      live: games.filter((g) => g.status === "live"),
      past: games.filter((g) => g.status === "final"),
      scheduled: games.filter((g) => g.status === "scheduled"),
      fetchedAt: new Date().toISOString(),
      cachedAt: new Date().toISOString(),
    };

    await writeSystemCache(cacheKey, bundle as object);
    return bundle;
  } catch (error) {
    console.warn("[football-schedule] fetch failed:", error);
    return emptyBundle();
  }
}

function emptyBundle(): FootballScheduleBundle {
  return {
    live: [],
    past: [],
    scheduled: [],
    fetchedAt: new Date().toISOString(),
  };
}

export async function fetchNflScheduleBundle(): Promise<FootballScheduleBundle> {
  return fetchScoreboardBundle("nfl", "nfl", "espn:schedule:nfl:v1");
}

export async function fetchCfbScheduleBundle(): Promise<FootballScheduleBundle> {
  return fetchScoreboardBundle("college-football", "cfb", "espn:schedule:cfb:v1");
}

export { formatNbaGameDate as formatFootballGameDate } from "@/lib/api/espn-nba-schedule";
