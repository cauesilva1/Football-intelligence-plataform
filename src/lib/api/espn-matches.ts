import { getPrisma } from "@/lib/prisma";
import { canUseDatabase } from "@/lib/system-cache";
import {
  BRAZIL_SEASON_LABEL,
  CURRENT_SEASON,
  ESPN_BRAZIL_SEASON_YEAR,
  FIFA_WORLD_CUP_LABEL,
  FIFA_WORLD_CUP_SEASON_LABEL,
  FIFA_WORLD_CUP_SEASON_YEAR,
  FIFA_WORLD_CUP_SLUG,
  MLS_SEASON_LABEL,
  isMlsLeague,
  isWorldCupCompetition,
  resolveEspnSeasonYear,
  resolvePersistedSeasonLabel,
} from "@/lib/seasons";
import type { StatsBombMatch } from "@/lib/statsbomb/types";
import { isBrazilianLeague } from "@/lib/api/transfermarkt";
import {
  isStale,
  MATCH_SYNC_TTL_MS,
  matchNeedsScoreRefresh,
  namesLikelyMatch,
  needsMatchSync,
} from "@/lib/sync/data-staleness";
import { resolveEspnLeague } from "@/lib/crests/espn-standings";

const ESPN_SCOREBOARD_BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer";
const EUROPEAN_MATCH_WINDOW_DAYS = 21;
const WORLD_CUP_MATCH_WINDOW_DAYS = 35;
const BRAZIL_LIVE_MATCH_WINDOW_DAYS = 45;
const ESPN_FETCH_TIMEOUT_MS = 12_000;

/** Dedup concurrent syncs for the same ESPN slug (dev HMR / parallel RSC). */
const syncInFlight = new Map<string, Promise<number>>();
/** After a sync attempt (success or fail), skip re-sync for a while. */
const lastSyncAttemptAt = new Map<string, number>();
const SYNC_ATTEMPT_COOLDOWN_MS = 15 * 60 * 1000;

function markSyncAttempt(key: string) {
  lastSyncAttemptAt.set(key, Date.now());
}

function recentlyAttemptedSync(key: string): boolean {
  const at = lastSyncAttemptAt.get(key);
  return at != null && Date.now() - at < SYNC_ATTEMPT_COOLDOWN_MS;
}

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
  if (isWorldCupCompetition(competitionLabel)) return FIFA_WORLD_CUP_SEASON_LABEL;
  if (isMlsLeague(competitionLabel)) return MLS_SEASON_LABEL;
  return isBrazilianLeague(competitionLabel) ? BRAZIL_SEASON_LABEL : CURRENT_SEASON;
}

function resolveSeasonYearForSlug(slug: string, competitionLabel: string, override?: number): number {
  if (override != null) return override;
  if (slug === FIFA_WORLD_CUP_SLUG) return FIFA_WORLD_CUP_SEASON_YEAR;
  return resolveEspnSeasonYear(competitionLabel);
}

function recentWorldCupMatchDates(windowDays = WORLD_CUP_MATCH_WINDOW_DAYS): Date[] {
  const dates: Date[] = [];
  const today = new Date();
  for (let offset = 0; offset < windowDays; offset += 1) {
    const day = new Date(today);
    day.setDate(today.getDate() - offset);
    dates.push(day);
  }
  return dates;
}

function nationalTeamShortName(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return words
    .map((w) => w[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
}

async function ensureWorldCupCompetitionId(): Promise<string | null> {
  const prisma = getPrisma();
  let competition = await prisma.competition.findFirst({
    where: {
      OR: [
        { espnSlug: FIFA_WORLD_CUP_SLUG },
        { name: { contains: "World Cup", mode: "insensitive" } },
      ],
    },
  });

  if (!competition) {
    competition = await prisma.competition.create({
      data: {
        name: FIFA_WORLD_CUP_LABEL,
        country: "International",
        tier: 1,
        espnSlug: FIFA_WORLD_CUP_SLUG,
      },
    });
  } else if (!competition.espnSlug) {
    competition = await prisma.competition.update({
      where: { id: competition.id },
      data: { espnSlug: FIFA_WORLD_CUP_SLUG },
    });
  }

  return competition.id;
}

async function resolveNationalTeamId(name: string, competitionId: string): Promise<string | null> {
  const prisma = getPrisma();
  // Only resolve within the World Cup competition — never match club rows by country
  // (e.g. "Spain" → Atlético Madrid / St. Pauli via team.country).
  const teams = await prisma.team.findMany({
    where: { competitionId },
    select: { id: true, name: true, shortName: true },
  });

  const match = teams.find(
    (team) => namesLikelyMatch(team.name, name) || namesLikelyMatch(team.shortName, name)
  );
  if (match) return match.id;

  const created = await prisma.team.create({
    data: {
      name,
      shortName: nationalTeamShortName(name),
      country: name,
      competitionId,
      dataSyncedSeason: FIFA_WORLD_CUP_SEASON_LABEL,
      dataSyncedAt: new Date(),
    },
    select: { id: true },
  });

  return created.id;
}

export async function fetchEspnScoreboard(
  slug: string,
  competitionLabel: string,
  options: EspnScoreboardFetchOptions = {}
): Promise<EspnScoreboardEvent[]> {
  const seasonYear = resolveSeasonYearForSlug(slug, competitionLabel, options.seasonYear);
  const params = new URLSearchParams({
    limit: "100",
    season: String(seasonYear),
  });
  if (options.date) params.set("dates", formatEspnDate(options.date));

  const url = `${ESPN_SCOREBOARD_BASE}/${slug}/scoreboard?${params.toString()}`;
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "football-intelligence-platform/1.0 (espn-matches)" },
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(ESPN_FETCH_TIMEOUT_MS),
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
  } catch (error) {
    console.warn(`[espn-matches] fetch failed on ${slug}:`, error);
    return [];
  }
}

async function resolveTeamIdByName(
  name: string,
  competitionId?: string | null
): Promise<string | null> {
  const prisma = getPrisma();
  const teams = await prisma.team.findMany({ select: { id: true, name: true, shortName: true } });

  const match = teams.find(
    (team) => namesLikelyMatch(team.name, name) || namesLikelyMatch(team.shortName, name)
  );
  if (match) return match.id;

  if (!competitionId) return null;

  const words = name.split(/\s+/).filter(Boolean);
  const shortName =
    words.length === 1
      ? words[0].slice(0, 3).toUpperCase()
      : words
          .map((w) => w[0])
          .join("")
          .slice(0, 3)
          .toUpperCase();

  const created = await prisma.team.create({
    data: {
      name,
      shortName,
      country: "International",
      competitionId,
    },
    select: { id: true },
  });
  return created.id;
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

  const created = await prisma.competition.create({
    data: {
      name: competitionName,
      country: espnSlug.startsWith("uefa") || espnSlug.startsWith("fifa") ? "International" : "Unknown",
      tier: 1,
      espnSlug,
    },
  });
  return created.id;
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
    const isWorldCup = event.espnSlug === FIFA_WORLD_CUP_SLUG;
    const worldCupCompetitionId = isWorldCup ? await ensureWorldCupCompetitionId() : null;

    const config = resolveEspnLeague(event.competitionLabel);
    const competitionId =
      worldCupCompetitionId ??
      (config ? await resolveCompetitionId(config.competitionLabel, config.slug) : null);

    const [homeTeamId, awayTeamId] = isWorldCup
      ? await Promise.all([
          resolveNationalTeamId(event.homeTeamName, worldCupCompetitionId!),
          resolveNationalTeamId(event.awayTeamName, worldCupCompetitionId!),
        ])
      : await Promise.all([
          resolveTeamIdByName(event.homeTeamName, competitionId),
          resolveTeamIdByName(event.awayTeamName, competitionId),
        ]);

    if (!homeTeamId || !awayTeamId) continue;

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
        homeTeamId,
        awayTeamId,
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

/** Re-fetch ESPN scoreboards for matches stuck as scheduled/0x0 after kickoff. */
export async function refreshStaleEspnMatches(
  competitionName?: string | null,
  teamIds?: string[]
): Promise<number> {
  if (!canUseDatabase()) return 0;

  if (isWorldCupCompetition(competitionName) || competitionName === FIFA_WORLD_CUP_LABEL) {
    return refreshStaleWorldCupMatches();
  }

  const prisma = getPrisma();
  const config = resolveEspnLeague(competitionName);
  if (!config) return 0;

  const seasonYear = resolveEspnSeasonYear(competitionName);
  const seasonLabel = resolvePersistedSeasonLabel(competitionName);

  const staleMatches = await prisma.match.findMany({
    where: {
      source: "espn",
      externalKey: { startsWith: `espn:${config.slug}:` },
      seasonLabel,
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

function teamsMatchPair(homeA: string, awayA: string, homeB: string, awayB: string): boolean {
  return (
    (namesLikelyMatch(homeA, homeB) && namesLikelyMatch(awayA, awayB)) ||
    (namesLikelyMatch(homeA, awayB) && namesLikelyMatch(awayA, homeB))
  );
}

function alignScoresToMatch(
  match: StatsBombMatch,
  event: EspnScoreboardEvent
): { homeScore: number; awayScore: number } {
  if (namesLikelyMatch(match.home_team.home_team_name, event.homeTeamName)) {
    return { homeScore: event.homeScore, awayScore: event.awayScore };
  }
  return { homeScore: event.awayScore, awayScore: event.homeScore };
}

function isPlaceholderTeamName(name: string): boolean {
  return /winner|loser|quarterfinal|semifinal|round of|tbd/i.test(name);
}

/** Merge live ESPN World Cup scores into cached tournament fixtures. */
export function mergeWorldCupLiveScores(
  cached: StatsBombMatch[],
  live: EspnScoreboardEvent[]
): StatsBombMatch[] {
  if (!live.length) return cached;

  return cached.map((match) => {
    const espnEventId = String(
      (match.metadata as { espn_event_id?: string | number } | undefined)?.espn_event_id ?? ""
    );

    const liveEvent = live.find((event) => {
      if (espnEventId && event.externalKey.endsWith(`:${espnEventId}`)) return true;
      const eventDate = event.matchDate.toISOString().slice(0, 10);
      if (eventDate !== match.match_date) return false;
      return teamsMatchPair(
        match.home_team.home_team_name,
        match.away_team.away_team_name,
        event.homeTeamName,
        event.awayTeamName
      );
    });

    if (!liveEvent || liveEvent.status === "scheduled") return match;

    const { homeScore, awayScore } = alignScoresToMatch(match, liveEvent);
    const finished = liveEvent.status === "finished";
    const replaceHome = isPlaceholderTeamName(match.home_team.home_team_name);
    const replaceAway = isPlaceholderTeamName(match.away_team.away_team_name);
    const homeAligned = namesLikelyMatch(match.home_team.home_team_name, liveEvent.homeTeamName);

    return {
      ...match,
      home_team: {
        ...match.home_team,
        home_team_name: replaceHome
          ? homeAligned || replaceAway
            ? liveEvent.homeTeamName
            : liveEvent.awayTeamName
          : match.home_team.home_team_name,
      },
      away_team: {
        ...match.away_team,
        away_team_name: replaceAway
          ? homeAligned || replaceHome
            ? liveEvent.awayTeamName
            : liveEvent.homeTeamName
          : match.away_team.away_team_name,
      },
      home_score: homeScore,
      away_score: awayScore,
      home_score_regular: homeScore,
      away_score_regular: awayScore,
      match_status: finished ? "available" : match.match_status,
      metadata: {
        ...(match.metadata ?? {}),
        espn_event_id: espnEventId || liveEvent.externalKey.split(":").pop(),
        live_merged_at: new Date().toISOString(),
      },
    };
  });
}

/** Fetch recent FIFA World Cup 2026 events from ESPN (`fifa.world`, season 2026). */
export async function fetchWorldCup2026LiveEvents(): Promise<EspnScoreboardEvent[]> {
  try {
    const dateFetches = recentWorldCupMatchDates().map((date) =>
      fetchEspnScoreboard(FIFA_WORLD_CUP_SLUG, FIFA_WORLD_CUP_LABEL, {
        date,
        seasonYear: FIFA_WORLD_CUP_SEASON_YEAR,
        seasonLabel: FIFA_WORLD_CUP_SEASON_LABEL,
      })
    );

    const batches = await Promise.all([
      fetchEspnScoreboard(FIFA_WORLD_CUP_SLUG, FIFA_WORLD_CUP_LABEL, {
        seasonYear: FIFA_WORLD_CUP_SEASON_YEAR,
        seasonLabel: FIFA_WORLD_CUP_SEASON_LABEL,
      }),
      ...dateFetches,
    ]);

    const merged = new Map<string, EspnScoreboardEvent>();
    for (const batch of batches) {
      for (const event of batch) {
        merged.set(event.externalKey, event);
      }
    }

    return [...merged.values()];
  } catch (error) {
    console.warn("[espn-matches] World Cup live fetch failed:", error);
    return [];
  }
}

/** Re-fetch stale World Cup matches (scheduled/0x0 after kickoff) from ESPN season 2026. */
export async function refreshStaleWorldCupMatches(): Promise<number> {
  if (!canUseDatabase()) return 0;

  const prisma = getPrisma();

  const staleMatches = await prisma.match.findMany({
    where: {
      source: "espn",
      externalKey: { startsWith: `espn:${FIFA_WORLD_CUP_SLUG}:` },
      seasonLabel: FIFA_WORLD_CUP_SEASON_LABEL,
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
    take: 80,
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
      return fetchEspnScoreboard(FIFA_WORLD_CUP_SLUG, FIFA_WORLD_CUP_LABEL, {
        date: new Date(y, m, d),
        seasonYear: FIFA_WORLD_CUP_SEASON_YEAR,
        seasonLabel: FIFA_WORLD_CUP_SEASON_LABEL,
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

/** Sync FIFA World Cup 2026 fixtures from ESPN (`fifa.world/scoreboard?season=2026`). */
export async function syncWorldCup2026Matches(): Promise<number> {
  try {
    const liveEvents = await fetchWorldCup2026LiveEvents();
    const saved = await persistEspnMatches(liveEvents);
    const refreshed = await refreshStaleWorldCupMatches();
    return saved + refreshed;
  } catch (error) {
    console.warn("[espn-matches] World Cup 2026 sync failed:", error);
    return 0;
  }
}

/** Ingest Brasileirão fixtures from ESPN season 2026 (live window). */
export async function syncBrasileiraoHistoricalMatches(): Promise<number> {
  const key = "bra.1";
  if (recentlyAttemptedSync(key)) return 0;

  const existing = syncInFlight.get(key);
  if (existing) return existing;

  markSyncAttempt(key);

  const promise = (async () => {
    const config = resolveEspnLeague("Brasileirão Série A");
    if (!config) return 0;

    try {
      const dateFetches = recentEuropeanMatchDates(BRAZIL_LIVE_MATCH_WINDOW_DAYS).map((date) =>
        fetchEspnScoreboard(config.slug, config.competitionLabel, {
          date,
          seasonYear: ESPN_BRAZIL_SEASON_YEAR,
          seasonLabel: BRAZIL_SEASON_LABEL,
        })
      );

      const [seasonBoard, ...datedBatches] = await Promise.all([
        fetchEspnScoreboard(config.slug, config.competitionLabel, {
          seasonYear: ESPN_BRAZIL_SEASON_YEAR,
          seasonLabel: BRAZIL_SEASON_LABEL,
        }),
        ...dateFetches,
      ]);

      const merged = new Map<string, EspnScoreboardEvent>();
      for (const batch of [seasonBoard, ...datedBatches]) {
        for (const event of batch) {
          merged.set(event.externalKey, event);
        }
      }

      const saved = await persistEspnMatches([...merged.values()]);
      const refreshed = await refreshStaleEspnMatches("Brasileirão Série A");
      return saved + refreshed;
    } catch (error) {
      console.warn("[espn-matches] Brasileirão 2026 sync failed:", error);
      return 0;
    }
  })().finally(() => {
    syncInFlight.delete(key);
  });

  syncInFlight.set(key, promise);
  return promise;
}

async function competitionNeedsEspnMatchSync(
  competitionName?: string | null
): Promise<boolean> {
  if (!canUseDatabase()) return false;

  const config = resolveEspnLeague(competitionName);
  if (!config) return false;

  const prisma = getPrisma();
  const competition = await prisma.competition.findFirst({
    where: { espnSlug: config.slug },
    select: { id: true },
  });
  if (!competition) return true;

  const seasonLabel = resolvePersistedSeasonLabel(competitionName);
  const minFinished =
    isBrazilianLeague(competitionName) || isMlsLeague(competitionName) || config.slug === "usa.1"
      ? 20
      : 10;

  const finishedMatches = await prisma.match.count({
    where: {
      competitionId: competition.id,
      status: "finished",
      seasonLabel,
    },
  });
  if (finishedMatches < minFinished) return true;

  const latestMatch = await prisma.match.findFirst({
    where: {
      competitionId: competition.id,
      seasonLabel,
    },
    orderBy: { updatedAt: "desc" },
    select: { seasonLabel: true, updatedAt: true },
  });

  const staleScheduled = await prisma.match.findFirst({
    where: {
      competitionId: competition.id,
      seasonLabel,
      status: { not: "finished" },
      matchDate: { lt: new Date(Date.now() - 2 * 60 * 60 * 1000) },
    },
    select: { id: true },
  });

  return (
    needsMatchSync(
      latestMatch?.seasonLabel ?? null,
      competitionName,
      latestMatch?.updatedAt,
      Boolean(staleScheduled)
    ) || isStale(latestMatch?.updatedAt, MATCH_SYNC_TTL_MS)
  );
}

/** Sync recent fixtures for a competition (European / Brasileirão live board). */
export async function syncEspnMatchesForCompetition(
  competitionName?: string | null
): Promise<number> {
  const config = resolveEspnLeague(competitionName);
  if (!config) return 0;

  if (!(await competitionNeedsEspnMatchSync(competitionName))) {
    return 0;
  }

  if (isWorldCupCompetition(competitionName) || config.slug === FIFA_WORLD_CUP_SLUG) {
    return syncWorldCup2026Matches();
  }

  if (isBrazilianLeague(competitionName)) {
    return syncBrasileiraoHistoricalMatches();
  }

  const key = config.slug;
  if (recentlyAttemptedSync(key)) return 0;

  const existing = syncInFlight.get(key);
  if (existing) return existing;

  markSyncAttempt(key);

  const promise = (async () => {
    const seasonYear = resolveEspnSeasonYear(competitionName);
    const seasonLabel = resolvePersistedSeasonLabel(competitionName);
    const windowDays =
      isMlsLeague(competitionName) || config.slug === "usa.1"
        ? BRAZIL_LIVE_MATCH_WINDOW_DAYS
        : EUROPEAN_MATCH_WINDOW_DAYS;

    try {
      const dateFetches = recentEuropeanMatchDates(windowDays).map((date) =>
        fetchEspnScoreboard(config.slug, config.competitionLabel, {
          date,
          seasonYear,
          seasonLabel,
        })
      );
      const [recentEvents, ...datedEvents] = await Promise.all([
        fetchEspnScoreboard(config.slug, config.competitionLabel, {
          seasonYear,
          seasonLabel,
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
  })().finally(() => {
    syncInFlight.delete(key);
  });

  syncInFlight.set(key, promise);
  return promise;
}

export {
  resolveEspnSeasonYear,
  isBrazilianLeague,
  FIFA_WORLD_CUP_SLUG,
  FIFA_WORLD_CUP_SEASON_YEAR,
};
