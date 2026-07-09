import { getPrisma } from "@/lib/prisma";
import { canUseDatabase } from "@/lib/system-cache";
import {
  BRAZIL_SEASON_LABEL,
  CURRENT_SEASON,
  ESPN_BRAZIL_SEASON_YEAR,
  resolveEspnSeasonYear,
} from "@/lib/seasons";
import { isBrazilianLeague } from "@/lib/api/transfermarkt";
import { matchNeedsScoreRefresh, namesLikelyMatch } from "@/lib/sync/data-staleness";
import { resolveEspnLeague } from "@/lib/crests/espn-standings";

const ESPN_SCOREBOARD_BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer";
const EUROPEAN_MATCH_WINDOW_DAYS = 21;

export interface EspnScoreboardEvent {
  externalKey: string;
  homeTeamName: string;
  awayTeamName: string;
  homeScore: number;
  awayScore: number;
  matchDate: Date;
  round?: string;
  status: string;
  seasonLabel: string;
  espnSlug: string;
  competitionLabel: string;
}

interface EspnCompetitor {
  homeAway: "home" | "away";
  score?: string;
  team?: { displayName?: string; name?: string };
  statistics?: Array<{ name?: string; displayValue?: string }>;
}

interface EspnScoreboardResponse {
  events?: Array<{
    id: string;
    name: string;
    date: string;
    status?: { type?: { name?: string; state?: string; completed?: boolean } };
    competitions?: Array<{
      notes?: Array<{ headline?: string }>;
      competitors?: EspnCompetitor[];
    }>;
  }>;
}

export interface EspnScoreboardFetchOptions {
  date?: Date;
  seasonYear?: number;
  seasonLabel?: string;
}

function formatEspnDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

function parseCompetitorScore(competitor?: EspnCompetitor): number {
  if (!competitor) return 0;

  const direct = Number(competitor.score);
  if (Number.isFinite(direct) && direct >= 0) return direct;

  const totalGoals = competitor.statistics?.find((stat) => stat.name === "totalGoals");
  const fromStats = Number(totalGoals?.displayValue);
  if (Number.isFinite(fromStats) && fromStats >= 0) return fromStats;

  return 0;
}

function mapEventStatus(
  state?: string,
  name?: string,
  completed?: boolean
): string {
  if (completed || state === "post") return "finished";
  if (state === "in") return "live";
  if (name?.toLowerCase().includes("postponed")) return "postponed";
  return "scheduled";
}

function recentEuropeanMatchDates(windowDays = EUROPEAN_MATCH_WINDOW_DAYS): Date[] {
  const dates: Date[] = [];
  const today = new Date();
  for (let offset = 0; offset < windowDays; offset += 1) {
    const day = new Date(today);
    day.setDate(today.getDate() - offset);
    dates.push(day);
  }
  return dates;
}

/** Bi-weekly sample dates across the finished Brasileirão 2025 campaign. */
export function brasileiraoHistoricalFetchDates(): Date[] {
  const dates: Date[] = [];
  const start = new Date(Date.UTC(2025, 3, 12));
  const end = new Date(Date.UTC(2025, 11, 7));
  for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 14)) {
    dates.push(new Date(cursor));
  }
  return dates;
}

function resolveSeasonLabel(competitionLabel: string, override?: string): string {
  if (override) return override;
  return isBrazilianLeague(competitionLabel) ? BRAZIL_SEASON_LABEL : CURRENT_SEASON;
}

export async function fetchEspnScoreboard(
  slug: string,
  competitionLabel: string,
  options: EspnScoreboardFetchOptions = {}
): Promise<EspnScoreboardEvent[]> {
  const seasonYear = options.seasonYear ?? resolveEspnSeasonYear(competitionLabel);
  const params = new URLSearchParams({
    limit: "100",
    season: String(seasonYear),
  });
  if (options.date) params.set("dates", formatEspnDate(options.date));

  const url = `${ESPN_SCOREBOARD_BASE}/${slug}/scoreboard?${params.toString()}`;
  const response = await fetch(url, {
    headers: { "User-Agent": "football-intelligence-platform/1.0 (espn-matches)" },
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    console.warn(`[espn-matches] HTTP ${response.status} on ${slug} season=${seasonYear}`);
    return [];
  }

  const data = (await response.json()) as EspnScoreboardResponse;
  const seasonLabel = resolveSeasonLabel(competitionLabel, options.seasonLabel);

  return (data.events ?? [])
    .map((event) => {
      const competition = event.competitions?.[0];
      const home = competition?.competitors?.find((c) => c.homeAway === "home");
      const away = competition?.competitors?.find((c) => c.homeAway === "away");
      const homeName = home?.team?.displayName ?? home?.team?.name ?? "";
      const awayName = away?.team?.displayName ?? away?.team?.name ?? "";
      if (!homeName || !awayName) return null;

      const row: EspnScoreboardEvent = {
        externalKey: `espn:${slug}:${event.id}`,
        homeTeamName: homeName,
        awayTeamName: awayName,
        homeScore: parseCompetitorScore(home),
        awayScore: parseCompetitorScore(away),
        matchDate: new Date(event.date),
        round: competition?.notes?.[0]?.headline,
        status: mapEventStatus(
          event.status?.type?.state,
          event.status?.type?.name,
          event.status?.type?.completed
        ),
        seasonLabel,
        espnSlug: slug,
        competitionLabel,
      };
      return row;
    })
    .filter((row): row is EspnScoreboardEvent => row != null);
}

async function resolveTeamIdByName(name: string): Promise<string | null> {
  const prisma = getPrisma();
  const teams = await prisma.team.findMany({ select: { id: true, name: true, shortName: true } });

  const match = teams.find(
    (team) => namesLikelyMatch(team.name, name) || namesLikelyMatch(team.shortName, name)
  );
  return match?.id ?? null;
}

async function resolveCompetitionId(
  competitionName: string,
  espnSlug: string
): Promise<string | null> {
  const prisma = getPrisma();
  const competition = await prisma.competition.findFirst({
    where: {
      OR: [
        { name: { contains: competitionName.split(" ")[0], mode: "insensitive" } },
        { espnSlug },
      ],
    },
  });

  if (competition) {
    if (!competition.espnSlug) {
      await prisma.competition.update({
        where: { id: competition.id },
        data: { espnSlug },
      });
    }
    return competition.id;
  }

  return null;
}

function shouldApplyEspnUpdate(
  existing: { status: string | null; homeScore: number; awayScore: number } | null,
  incoming: EspnScoreboardEvent
): boolean {
  if (!existing) return true;
  if (incoming.status === "finished") return true;
  if (existing.status === "finished" && incoming.status !== "finished") return false;
  if (
    existing.status !== "finished" &&
    incoming.homeScore === 0 &&
    incoming.awayScore === 0 &&
    (existing.homeScore > 0 || existing.awayScore > 0)
  ) {
    return false;
  }
  return true;
}

/** Persist ESPN fixtures into the Match table (upsert by externalKey). */
export async function persistEspnMatches(events: EspnScoreboardEvent[]): Promise<number> {
  if (!canUseDatabase() || events.length === 0) return 0;

  const prisma = getPrisma();
  let saved = 0;

  for (const event of events) {
    const [homeTeamId, awayTeamId] = await Promise.all([
      resolveTeamIdByName(event.homeTeamName),
      resolveTeamIdByName(event.awayTeamName),
    ]);

    if (!homeTeamId || !awayTeamId) continue;

    const config = resolveEspnLeague(event.competitionLabel);
    const competitionId = config
      ? await resolveCompetitionId(config.competitionLabel, config.slug)
      : null;

    const existing = await prisma.match.findUnique({
      where: { externalKey: event.externalKey },
      select: { status: true, homeScore: true, awayScore: true },
    });

    if (!shouldApplyEspnUpdate(existing, event)) continue;

    await prisma.match.upsert({
      where: { externalKey: event.externalKey },
      create: {
        externalKey: event.externalKey,
        homeTeamId,
        awayTeamId,
        homeScore: event.homeScore,
        awayScore: event.awayScore,
        matchDate: event.matchDate,
        round: event.round,
        status: event.status,
        seasonLabel: event.seasonLabel,
        source: "espn",
        competitionId: competitionId ?? undefined,
      },
      update: {
        homeScore: event.homeScore,
        awayScore: event.awayScore,
        matchDate: event.matchDate,
        round: event.round,
        status: event.status,
        seasonLabel: event.seasonLabel,
        competitionId: competitionId ?? undefined,
      },
    });

    saved += 1;
  }

  return saved;
}

/** Re-fetch ESPN scoreboards for European matches stuck as scheduled/0x0 after kickoff. */
export async function refreshStaleEspnMatches(
  competitionName?: string | null,
  teamIds?: string[]
): Promise<number> {
  if (!canUseDatabase()) return 0;
  if (isBrazilianLeague(competitionName)) return 0;

  const prisma = getPrisma();
  const config = resolveEspnLeague(competitionName);
  if (!config) return 0;

  const seasonYear = resolveEspnSeasonYear(competitionName);

  const staleMatches = await prisma.match.findMany({
    where: {
      source: "espn",
      externalKey: { startsWith: `espn:${config.slug}:` },
      seasonLabel: CURRENT_SEASON,
      ...(teamIds?.length
        ? { OR: [{ homeTeamId: { in: teamIds } }, { awayTeamId: { in: teamIds } }] }
        : {}),
      matchDate: { lt: new Date(Date.now() - 2 * 60 * 60 * 1000) },
    },
    select: {
      externalKey: true,
      status: true,
      matchDate: true,
      homeScore: true,
      awayScore: true,
    },
    orderBy: { matchDate: "desc" },
    take: 60,
  });

  const needsRefresh = staleMatches.filter((match) =>
    matchNeedsScoreRefresh({
      status: match.status ?? "scheduled",
      matchDate: match.matchDate,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
    })
  );

  if (!needsRefresh.length) return 0;

  const datesToFetch = new Set<string>();
  for (const match of needsRefresh) {
    datesToFetch.add(formatEspnDate(match.matchDate));
  }

  const fetched = await Promise.all(
    [...datesToFetch].map((dateStr) => {
      const y = Number(dateStr.slice(0, 4));
      const m = Number(dateStr.slice(4, 6)) - 1;
      const d = Number(dateStr.slice(6, 8));
      return fetchEspnScoreboard(config.slug, config.competitionLabel, {
        date: new Date(y, m, d),
        seasonYear,
        seasonLabel: CURRENT_SEASON,
      });
    })
  );

  const merged = new Map<string, EspnScoreboardEvent>();
  for (const batch of fetched) {
    for (const event of batch) {
      merged.set(event.externalKey, event);
    }
  }

  const targeted = needsRefresh
    .map((match) => merged.get(match.externalKey ?? ""))
    .filter((event): event is EspnScoreboardEvent => event != null);

  return persistEspnMatches(targeted);
}

/** Ingest finished Brasileirão fixtures from ESPN season 2025 (historical, stable). */
export async function syncBrasileiraoHistoricalMatches(): Promise<number> {
  const config = resolveEspnLeague("Brasileirão Série A");
  if (!config) return 0;

  try {
    const dateFetches = brasileiraoHistoricalFetchDates().map((date) =>
      fetchEspnScoreboard(config.slug, config.competitionLabel, {
        date,
        seasonYear: ESPN_BRAZIL_SEASON_YEAR,
        seasonLabel: BRAZIL_SEASON_LABEL,
      })
    );

    const batches = await Promise.all(dateFetches);
    const merged = new Map<string, EspnScoreboardEvent>();
    for (const batch of batches) {
      for (const event of batch) {
        if (event.status === "finished") {
          merged.set(event.externalKey, event);
        }
      }
    }

    return persistEspnMatches([...merged.values()]);
  } catch (error) {
    console.warn("[espn-matches] Brasileirão 2025 historical sync failed:", error);
    return 0;
  }
}

/** Sync recent fixtures for a competition (European live board or Brasileirão 2025 archive). */
export async function syncEspnMatchesForCompetition(
  competitionName?: string | null
): Promise<number> {
  const config = resolveEspnLeague(competitionName);
  if (!config) return 0;

  if (isBrazilianLeague(competitionName)) {
    return syncBrasileiraoHistoricalMatches();
  }

  const seasonYear = resolveEspnSeasonYear(competitionName);

  try {
    const dateFetches = recentEuropeanMatchDates().map((date) =>
      fetchEspnScoreboard(config.slug, config.competitionLabel, {
        date,
        seasonYear,
        seasonLabel: CURRENT_SEASON,
      })
    );
    const [recentEvents, ...datedEvents] = await Promise.all([
      fetchEspnScoreboard(config.slug, config.competitionLabel, {
        seasonYear,
        seasonLabel: CURRENT_SEASON,
      }),
      ...dateFetches,
    ]);

    const merged = new Map<string, EspnScoreboardEvent>();
    for (const event of [...recentEvents, ...datedEvents.flat()]) {
      merged.set(event.externalKey, event);
    }

    const saved = await persistEspnMatches([...merged.values()]);
    const refreshed = await refreshStaleEspnMatches(competitionName);
    return saved + refreshed;
  } catch (error) {
    console.warn("[espn-matches] Sync failed for", competitionName, error);
    return 0;
  }
}

export { resolveEspnSeasonYear, isBrazilianLeague };
