import { getPrisma } from "@/lib/prisma";

export const NBA_BOXSCORE_SEASON = 202627;
export type BasketballLeagueSlug = "nba" | "nba-summer";

const SUMMER_LEAGUE_CACHE_PREFIX = "espn:basketball:nba-summer:roster:2026:";

function scoreboardUrl(league: BasketballLeagueSlug): string {
  return `https://site.api.espn.com/apis/site/v2/sports/basketball/${league}/scoreboard`;
}

function summaryUrl(league: BasketballLeagueSlug): string {
  return `https://site.api.espn.com/apis/site/v2/sports/basketball/${league}/summary`;
}

function boxscoreCachePrefix(league: BasketballLeagueSlug): string {
  return `espn:basketball:${league}:boxscore:${NBA_BOXSCORE_SEASON}:`;
}

const ESPN_LEAGUE: BasketballLeagueSlug = "nba";
const BOXSCORE_CACHE_PREFIX = boxscoreCachePrefix(ESPN_LEAGUE);
const SCOREBOARD_URL = scoreboardUrl(ESPN_LEAGUE);
const SUMMARY_URL = summaryUrl(ESPN_LEAGUE);

const STAT_INDEX = {
  minutes: 0,
  points: 1,
  fieldGoals: 2,
  threePointers: 3,
  freeThrows: 4,
  rebounds: 5,
  assists: 6,
  turnovers: 7,
  steals: 8,
  blocks: 9,
} as const;

export interface BasketballPlayerBoxScore {
  espnAthleteId: string;
  fullName: string;
  teamName: string;
  minutesPlayed: number;
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  fieldGoalsMade: number;
  fieldGoalsAttempted: number;
  threePointsMade: number;
  threePointsAttempted: number;
}

export interface ProcessSummerLeagueBoxScoreResult {
  eventId: string;
  playersMarked: number;
  skipped: number;
  alreadyProcessed: boolean;
}

export interface ProcessBasketballBoxScoreResult {
  eventId: string;
  playersProcessed: number;
  statsUpdated: number;
  skipped: number;
  failed: number;
  alreadyProcessed: boolean;
}

export interface SyncBasketballBoxScoresResult {
  date: string;
  eventsFound: number;
  finalEvents: number;
  processed: ProcessBasketballBoxScoreResult[];
}

interface EspnAthleteEntry {
  active?: boolean;
  starter?: boolean;
  didNotPlay?: boolean;
  athlete?: { id?: string; displayName?: string; fullName?: string };
  stats?: string[];
}

interface EspnSummaryResponse {
  boxscore?: {
    players?: Array<{
      team?: { displayName?: string; name?: string };
      statistics?: Array<{
        names?: string[];
        athletes?: EspnAthleteEntry[];
      }>;
    }>;
  };
  header?: {
    competitions?: Array<{
      status?: { type?: { state?: string; completed?: boolean; name?: string } };
    }>;
  };
}

interface EspnScoreboardEvent {
  id: string;
  name?: string;
  status?: { type?: { name?: string; state?: string; completed?: boolean } };
  competitions?: Array<{
    status?: { type?: { name?: string; state?: string; completed?: boolean } };
  }>;
}

interface EspnScoreboardResponse {
  events?: EspnScoreboardEvent[];
}

function parseNumber(value?: string): number {
  if (!value?.trim() || value === "-") return 0;
  const parsed = Number.parseFloat(value.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseMadeAttempted(value?: string): { made: number; attempted: number } {
  if (!value?.trim() || value === "-") return { made: 0, attempted: 0 };
  const [madeRaw, attemptedRaw] = value.split("-");
  const made = parseNumber(madeRaw);
  const attempted = parseNumber(attemptedRaw);
  return { made, attempted };
}

function parseMinutes(value?: string): number {
  if (!value?.trim() || value === "-") return 0;
  if (value.includes(":")) {
    const [mins, secs] = value.split(":").map((part) => Number.parseInt(part, 10));
    if (Number.isFinite(mins) && Number.isFinite(secs)) {
      return mins + secs / 60;
    }
  }
  return parseNumber(value);
}

function shotPercent(made: number, attempted: number): number {
  if (attempted <= 0) return 0;
  return Number(((made / attempted) * 100).toFixed(1));
}

function rollingAverage(currentAvg: number, games: number, gameValue: number): number {
  if (games <= 0) return gameValue;
  return (currentAvg * games + gameValue) / (games + 1);
}

function rollingPercent(
  currentPct: number,
  games: number,
  made: number,
  attempted: number
): number {
  if (attempted <= 0) return currentPct;
  const gamePct = (made / attempted) * 100;
  if (games <= 0) return Number(gamePct.toFixed(1));
  return Number(rollingAverage(currentPct, games, gamePct).toFixed(1));
}

function athletePlayed(entry: EspnAthleteEntry): boolean {
  if (entry.didNotPlay) return false;
  const minutes = parseMinutes(entry.stats?.[STAT_INDEX.minutes]);
  return minutes > 0;
}

function extractPlayerBoxScores(summary: EspnSummaryResponse): BasketballPlayerBoxScore[] {
  const rows: BasketballPlayerBoxScore[] = [];

  for (const teamBlock of summary.boxscore?.players ?? []) {
    const teamName = teamBlock.team?.displayName ?? teamBlock.team?.name ?? "Unknown";
    const athletes = teamBlock.statistics?.[0]?.athletes ?? [];

    for (const entry of athletes) {
      if (!athletePlayed(entry)) continue;

      const espnAthleteId = entry.athlete?.id;
      const fullName = entry.athlete?.displayName ?? entry.athlete?.fullName;
      if (!espnAthleteId || !fullName) continue;

      const stats = entry.stats ?? [];
      const fg = parseMadeAttempted(stats[STAT_INDEX.fieldGoals]);
      const threePt = parseMadeAttempted(stats[STAT_INDEX.threePointers]);

      rows.push({
        espnAthleteId,
        fullName,
        teamName,
        minutesPlayed: Math.round(parseMinutes(stats[STAT_INDEX.minutes])),
        points: parseNumber(stats[STAT_INDEX.points]),
        rebounds: parseNumber(stats[STAT_INDEX.rebounds]),
        assists: parseNumber(stats[STAT_INDEX.assists]),
        steals: parseNumber(stats[STAT_INDEX.steals]),
        blocks: parseNumber(stats[STAT_INDEX.blocks]),
        fieldGoalsMade: fg.made,
        fieldGoalsAttempted: fg.attempted,
        threePointsMade: threePt.made,
        threePointsAttempted: threePt.attempted,
      });
    }
  }

  return rows;
}

function isMatchFinished(summary: EspnSummaryResponse): boolean {
  const status = summary.header?.competitions?.[0]?.status?.type;
  return status?.completed === true || status?.state === "post" || status?.name === "STATUS_FINAL";
}

export function formatEspnDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

export async function fetchBasketballScoreboard(
  league: BasketballLeagueSlug = "nba",
  date = new Date()
): Promise<EspnScoreboardEvent[]> {
  const url = `${scoreboardUrl(league)}?dates=${formatEspnDate(date)}`;
  const response = await fetch(url, {
    headers: {
      "User-Agent": "football-intelligence-platform/1.0 (basketball-boxscore-sync)",
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(45_000),
  });

  if (!response.ok) {
    throw new Error(`ESPN scoreboard HTTP ${response.status} (${league})`);
  }

  const payload = (await response.json()) as EspnScoreboardResponse;
  return payload.events ?? [];
}

export async function fetchNbaScoreboard(date = new Date()): Promise<EspnScoreboardEvent[]> {
  return fetchBasketballScoreboard("nba", date);
}

export function isFinalNbaEvent(event: EspnScoreboardEvent): boolean {
  const status = event.competitions?.[0]?.status?.type ?? event.status?.type;
  if (!status) return false;

  return (
    status.name === "STATUS_FINAL" ||
    status.completed === true ||
    status.state === "post"
  );
}

async function fetchMatchSummary(
  eventId: string,
  league: BasketballLeagueSlug = "nba"
): Promise<EspnSummaryResponse> {
  const url = `${summaryUrl(league)}?event=${eventId}`;
  const response = await fetch(url, {
    headers: {
      "User-Agent": "football-intelligence-platform/1.0 (basketball-boxscore-sync)",
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(45_000),
  });

  if (!response.ok) {
    throw new Error(`ESPN summary HTTP ${response.status} — event ${eventId}`);
  }

  return (await response.json()) as EspnSummaryResponse;
}

async function resolvePlayerId(espnAthleteId: string): Promise<string | null> {
  const prisma = getPrisma();
  const numericId = Number.parseInt(espnAthleteId, 10);

  const player = await prisma.player.findFirst({
    where: {
      sport: "BASKETBALL",
      ...(Number.isFinite(numericId) ? { apiSportsId: numericId } : {}),
    },
    select: { id: true },
  });

  return player?.id ?? null;
}

async function accumulateSeasonStats(
  playerId: string,
  boxScore: BasketballPlayerBoxScore
): Promise<void> {
  const prisma = getPrisma();

  const existing = await prisma.playerSeasonStats.findUnique({
    where: {
      playerId_season: {
        playerId,
        season: NBA_BOXSCORE_SEASON,
      },
    },
  });

  const games = existing?.matchesPlayed ?? 0;

  if (!existing) {
    await prisma.playerSeasonStats.create({
      data: {
        playerId,
        season: NBA_BOXSCORE_SEASON,
        matchesPlayed: 1,
        minutesPlayed: boxScore.minutesPlayed,
        points: Math.round(boxScore.points),
        rebounds: Math.round(boxScore.rebounds),
        assists: Math.round(boxScore.assists),
        steals: Math.round(boxScore.steals),
        blocks: Math.round(boxScore.blocks),
        fieldGoalsPercent: shotPercent(boxScore.fieldGoalsMade, boxScore.fieldGoalsAttempted),
        threePointsPercent: shotPercent(boxScore.threePointsMade, boxScore.threePointsAttempted),
      },
    });
    return;
  }

  await prisma.playerSeasonStats.update({
    where: {
      playerId_season: {
        playerId,
        season: NBA_BOXSCORE_SEASON,
      },
    },
    data: {
      matchesPlayed: existing.matchesPlayed + 1,
      minutesPlayed: existing.minutesPlayed + boxScore.minutesPlayed,
      points: Math.round(rollingAverage(existing.points, games, boxScore.points)),
      rebounds: Math.round(rollingAverage(existing.rebounds, games, boxScore.rebounds)),
      assists: Math.round(rollingAverage(existing.assists, games, boxScore.assists)),
      steals: Math.round(rollingAverage(existing.steals, games, boxScore.steals)),
      blocks: Math.round(rollingAverage(existing.blocks, games, boxScore.blocks)),
      fieldGoalsPercent: rollingPercent(
        existing.fieldGoalsPercent,
        games,
        boxScore.fieldGoalsMade,
        boxScore.fieldGoalsAttempted
      ),
      threePointsPercent: rollingPercent(
        existing.threePointsPercent,
        games,
        boxScore.threePointsMade,
        boxScore.threePointsAttempted
      ),
    },
  });
}

/**
 * Marca jogadores que apareceram no box score da Summer League 2026.
 */
export async function processSummerLeagueBoxScore(
  eventId: string,
  options: { force?: boolean } = {}
): Promise<ProcessSummerLeagueBoxScoreResult> {
  const prisma = getPrisma();
  const cacheKey = `${SUMMER_LEAGUE_CACHE_PREFIX}${eventId}`;

  if (!options.force) {
    const cached = await prisma.systemCache.findUnique({ where: { key: cacheKey } });
    if (cached) {
      return { eventId, playersMarked: 0, skipped: 0, alreadyProcessed: true };
    }
  }

  const summary = await fetchMatchSummary(eventId, "nba-summer");
  if (!isMatchFinished(summary)) {
    return { eventId, playersMarked: 0, skipped: 0, alreadyProcessed: false };
  }

  const boxScores = extractPlayerBoxScores(summary);
  let playersMarked = 0;
  let skipped = 0;

  for (const boxScore of boxScores) {
    const playerId = await resolvePlayerId(boxScore.espnAthleteId);
    if (!playerId) {
      skipped += 1;
      continue;
    }

    await prisma.player.update({
      where: { id: playerId },
      data: { summerLeague2026: true },
    });
    playersMarked += 1;
  }

  await prisma.systemCache.upsert({
    where: { key: cacheKey },
    create: {
      key: cacheKey,
      json: {
        eventId,
        processedAt: new Date().toISOString(),
        playersMarked,
        skipped,
      },
    },
    update: {
      json: {
        eventId,
        processedAt: new Date().toISOString(),
        playersMarked,
        skipped,
      },
    },
  });

  return { eventId, playersMarked, skipped, alreadyProcessed: false };
}

/**
 * Processa o box score NBA de um evento finalizado e acumula médias na temporada 202627.
 */
export async function processBasketballBoxScore(
  eventId: string,
  options: { force?: boolean; league?: BasketballLeagueSlug } = {}
): Promise<ProcessBasketballBoxScoreResult> {
  const league = options.league ?? "nba";
  if (league === "nba-summer") {
    const summer = await processSummerLeagueBoxScore(eventId, options);
    return {
      eventId,
      playersProcessed: summer.playersMarked + summer.skipped,
      statsUpdated: summer.playersMarked,
      skipped: summer.skipped,
      failed: 0,
      alreadyProcessed: summer.alreadyProcessed,
    };
  }

  const prisma = getPrisma();
  const cacheKey = `${boxscoreCachePrefix(league)}${eventId}`;

  if (!options.force) {
    const cached = await prisma.systemCache.findUnique({ where: { key: cacheKey } });
    if (cached) {
      return {
        eventId,
        playersProcessed: 0,
        statsUpdated: 0,
        skipped: 0,
        failed: 0,
        alreadyProcessed: true,
      };
    }
  }

  const summary = await fetchMatchSummary(eventId, league);
  if (!isMatchFinished(summary)) {
    throw new Error(`Partida ${eventId} ainda não finalizada na ESPN.`);
  }

  const boxScores = extractPlayerBoxScores(summary);

  let playersProcessed = 0;
  let statsUpdated = 0;
  let skipped = 0;
  let failed = 0;

  for (const boxScore of boxScores) {
    playersProcessed += 1;

    try {
      const playerId = await resolvePlayerId(boxScore.espnAthleteId);
      if (!playerId) {
        skipped += 1;
        console.warn(
          `[boxscore-nba] SKIP ${boxScore.fullName} (ESPN ${boxScore.espnAthleteId}) — jogador não encontrado no banco`
        );
        continue;
      }

      await accumulateSeasonStats(playerId, boxScore);
      statsUpdated += 1;
    } catch (error) {
      failed += 1;
      console.warn(`[boxscore-nba] FAIL ${boxScore.fullName}:`, error);
    }
  }

  await prisma.systemCache.upsert({
    where: { key: cacheKey },
    create: {
      key: cacheKey,
      json: {
        eventId,
        processedAt: new Date().toISOString(),
        playersProcessed,
        statsUpdated,
        skipped,
        failed,
      },
    },
    update: {
      json: {
        eventId,
        processedAt: new Date().toISOString(),
        playersProcessed,
        statsUpdated,
        skipped,
        failed,
      },
    },
  });

  return {
    eventId,
    playersProcessed,
    statsUpdated,
    skipped,
    failed,
    alreadyProcessed: false,
  };
}

export async function syncTodaysSummerLeagueRosterFlags(
  date = new Date(),
  options: { force?: boolean } = {}
): Promise<{ date: string; finalEvents: number; processed: ProcessSummerLeagueBoxScoreResult[] }> {
  const events = await fetchBasketballScoreboard("nba-summer", date);
  const finalEvents = events.filter(isFinalNbaEvent);
  const processed: ProcessSummerLeagueBoxScoreResult[] = [];

  for (const event of finalEvents) {
    const result = await processSummerLeagueBoxScore(event.id, options);
    processed.push(result);
  }

  return {
    date: formatEspnDate(date),
    finalEvents: finalEvents.length,
    processed,
  };
}

/**
 * Varre o scoreboard do dia e processa todos os jogos finalizados.
 */
export async function syncTodaysBasketballBoxScores(
  date = new Date(),
  options: { force?: boolean } = {}
): Promise<SyncBasketballBoxScoresResult> {
  const events = await fetchNbaScoreboard(date);
  const finalEvents = events.filter(isFinalNbaEvent);
  const processed: ProcessBasketballBoxScoreResult[] = [];

  for (const event of finalEvents) {
    const result = await processBasketballBoxScore(event.id, options);
    processed.push(result);
  }

  const summer = await syncTodaysSummerLeagueRosterFlags(date, options);
  for (const result of summer.processed) {
    processed.push({
      eventId: result.eventId,
      playersProcessed: result.playersMarked + result.skipped,
      statsUpdated: result.playersMarked,
      skipped: result.skipped,
      failed: 0,
      alreadyProcessed: result.alreadyProcessed,
    });
  }

  return {
    date: formatEspnDate(date),
    eventsFound: events.length + summer.finalEvents,
    finalEvents: finalEvents.length + summer.finalEvents,
    processed,
  };
}

export { BOXSCORE_CACHE_PREFIX, SCOREBOARD_URL, SUMMARY_URL };
