/**
 * ESPN American football boxscore → PlayerMatchStat + season accumulation.
 * Supports NFL + CFB (college-football path, product key `cfb`).
 */
import { getPrisma } from "@/lib/prisma";
import { isDbSource } from "@/lib/data-source";
import {
  upsertPlayerMatchStat,
  buildEspnEventKey,
} from "@/lib/api/player-match-stats";
import {
  fetchFootballMatchDetail,
  footballMatchExternalKey,
  type FootballBoxCategory,
  type FootballBoxPlayer,
  type FootballMatchCompetition,
  type FootballMatchDetail,
} from "@/lib/api/espn-football-match-detail";
import { resolveFootballStatsSeasonYear } from "@/lib/api/espn-football-seasons";
import { computeFootballMatchRating } from "@/lib/scoring/football-rating";
import { encodeFootballStatsForPrisma } from "@/lib/api/espn-football-athlete-stats";

export type FootballLeagueSlug = FootballMatchCompetition; // "nfl" | "cfb"

const CACHE_PREFIX = "football:boxscore:";

export type FootballPlayerBoxLine = {
  espnAthleteId: string;
  fullName: string;
  teamName: string;
  passingYards: number;
  rushingYards: number;
  receivingYards: number;
  touchdowns: number;
  tackles: number;
  sacks: number;
  interceptions: number;
  receptions: number;
  completions: number;
  attempts: number;
};

export type ProcessFootballBoxScoreResult = {
  eventId: string;
  playersProcessed: number;
  statsUpdated: number;
  skipped: number;
  failed: number;
  alreadyProcessed: boolean;
};

export type SyncFootballBoxScoresResult = {
  date: string;
  eventsFound: number;
  finalEvents: number;
  processed: ProcessFootballBoxScoreResult[];
};

function parseNum(raw: string | undefined): number {
  if (!raw || raw === "—" || raw === "-") return 0;
  const cleaned = raw.replace(/,/g, "").trim();
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function parseCompletionPair(raw: string | undefined): { completions: number; attempts: number } {
  if (!raw || raw === "—") return { completions: 0, attempts: 0 };
  const m = /^(\d+)\s*\/\s*(\d+)$/.exec(raw.trim());
  if (!m) return { completions: 0, attempts: 0 };
  return { completions: Number(m[1]), attempts: Number(m[2]) };
}

function emptyLine(
  espnAthleteId: string,
  fullName: string,
  teamName: string
): FootballPlayerBoxLine {
  return {
    espnAthleteId,
    fullName,
    teamName,
    passingYards: 0,
    rushingYards: 0,
    receivingYards: 0,
    touchdowns: 0,
    tackles: 0,
    sacks: 0,
    interceptions: 0,
    receptions: 0,
    completions: 0,
    attempts: 0,
  };
}

/** Merge multi-category ESPN box rows into one line per athlete. */
export function aggregateFootballBoxPlayers(
  players: FootballBoxPlayer[]
): FootballPlayerBoxLine[] {
  const byId = new Map<string, FootballPlayerBoxLine>();

  for (const row of players) {
    const key = row.espnAthleteId || `${row.fullName}|${row.teamName}`;
    const line = byId.get(key) ?? emptyLine(row.espnAthleteId, row.fullName, row.teamName);
    applyCategory(line, row.category, row.cells);
    byId.set(key, line);
  }

  return [...byId.values()];
}

function applyCategory(
  line: FootballPlayerBoxLine,
  category: FootballBoxCategory,
  cells: string[]
): void {
  if (category === "passing") {
    const pair = parseCompletionPair(cells[0]);
    line.completions += pair.completions;
    line.attempts += pair.attempts;
    line.passingYards += parseNum(cells[1]);
    line.touchdowns += parseNum(cells[2]);
    line.interceptions += parseNum(cells[3]);
  } else if (category === "rushing") {
    line.rushingYards += parseNum(cells[1]);
    line.touchdowns += parseNum(cells[3]);
  } else if (category === "receiving") {
    line.receptions += parseNum(cells[0]);
    line.receivingYards += parseNum(cells[1]);
    line.touchdowns += parseNum(cells[2]);
  } else if (category === "defensive") {
    line.tackles += parseNum(cells[0]);
    line.sacks += parseNum(cells[2]);
  }
}

function lineHasProduction(line: FootballPlayerBoxLine): boolean {
  return (
    line.passingYards +
      line.rushingYards +
      line.receivingYards +
      line.touchdowns +
      line.tackles +
      line.sacks +
      line.interceptions >
    0
  );
}

function totalYards(line: FootballPlayerBoxLine): number {
  return line.passingYards + line.rushingYards + line.receivingYards;
}

/** Proxy minutes when ESPN boxscore has no snap counts. */
function proxyMinutes(line: FootballPlayerBoxLine): number {
  return lineHasProduction(line) ? 60 : 0;
}

export function formatEspnFootballDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

export function resolveFootballBoxscoreSeason(
  _league: FootballLeagueSlug,
  now = new Date()
): number {
  return resolveFootballStatsSeasonYear(now);
}

function competitionLabel(league: FootballLeagueSlug): string {
  return league === "nfl" ? "NFL" : "College Football";
}

function espnPathSlug(league: FootballLeagueSlug): string {
  return league === "cfb" ? "college-football" : "nfl";
}

async function fetchScoreboard(
  league: FootballLeagueSlug,
  date: Date
): Promise<Array<{ id: string; completed: boolean }>> {
  const datestr = formatEspnFootballDate(date);
  const url = `https://site.api.espn.com/apis/site/v2/sports/football/${espnPathSlug(
    league
  )}/scoreboard?dates=${datestr}`;
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "football-intelligence-platform/1.0 (football-boxscore)",
    },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) {
    throw new Error(`ESPN football scoreboard HTTP ${response.status}`);
  }
  const data = (await response.json()) as {
    events?: Array<{
      id?: string;
      status?: { type?: { completed?: boolean; state?: string; name?: string } };
      competitions?: Array<{
        status?: { type?: { completed?: boolean; state?: string; name?: string } };
      }>;
    }>;
  };

  return (data.events ?? [])
    .filter((e) => e.id)
    .map((e) => {
      const t = e.competitions?.[0]?.status?.type ?? e.status?.type;
      const completed =
        Boolean(t?.completed) || t?.state === "post" || t?.name === "STATUS_FINAL";
      return { id: e.id!, completed };
    });
}

async function resolvePlayerId(espnAthleteId: string): Promise<string | null> {
  if (!espnAthleteId) return null;
  const prisma = getPrisma();
  const numericId = Number.parseInt(espnAthleteId, 10);
  if (!Number.isFinite(numericId)) return null;

  const player = await prisma.player.findFirst({
    where: { sport: "AMERICAN_FOOTBALL", apiSportsId: numericId },
    select: { id: true },
  });
  return player?.id ?? null;
}

function rollingAverage(currentAvg: number, games: number, nextValue: number): number {
  return (currentAvg * games + nextValue) / (games + 1);
}

async function accumulateSeasonStats(
  playerId: string,
  line: FootballPlayerBoxLine,
  season: number
): Promise<void> {
  const prisma = getPrisma();
  const existing = await prisma.playerSeasonStats.findUnique({
    where: { playerId_season: { playerId, season } },
  });
  const games = existing?.matchesPlayed ?? 0;
  const yards = totalYards(line);
  const encoded = encodeFootballStatsForPrisma({
    matchesPlayed: 1,
    passingYards: line.passingYards,
    rushingYards: line.rushingYards,
    receivingYards: line.receivingYards,
    totalYards: yards,
    touchdowns: line.touchdowns,
    receptions: line.receptions,
    completions: line.completions,
    completionPct: line.attempts > 0 ? (line.completions / line.attempts) * 100 : 0,
    tackles: line.tackles,
    sacks: line.sacks,
    interceptions: line.interceptions,
  });

  if (!existing) {
    await prisma.playerSeasonStats.create({
      data: {
        playerId,
        season,
        ...encoded,
      },
    });
    return;
  }

  // Season AF rows store season totals for yards/TDs (additive from boxscore).
  await prisma.playerSeasonStats.update({
    where: { playerId_season: { playerId, season } },
    data: {
      matchesPlayed: existing.matchesPlayed + 1,
      minutesPlayed: existing.minutesPlayed + 60,
      assists: existing.assists + Math.round(line.receptions || line.completions),
      tackles: existing.tackles + line.tackles,
      interceptions: existing.interceptions + line.interceptions,
      passingAccuracy: rollingAverage(
        existing.passingAccuracy,
        games,
        encoded.passingAccuracy
      ),
      passingYards: (existing.passingYards ?? 0) + Math.round(line.passingYards),
      rushingYards: (existing.rushingYards ?? 0) + Math.round(line.rushingYards),
      receivingYards: (existing.receivingYards ?? 0) + Math.round(line.receivingYards),
      touchdowns: (existing.touchdowns ?? 0) + Math.round(line.touchdowns),
      sacks: (existing.sacks ?? 0) + line.sacks,
      totalYards: (existing.totalYards ?? 0) + Math.round(yards),
    },
  });
}

async function upsertMatchLine(
  playerId: string,
  line: FootballPlayerBoxLine,
  meta: {
    league: FootballLeagueSlug;
    eventId: string;
    matchDate?: Date | null;
    homeTeamName?: string | null;
    awayTeamName?: string | null;
    season: number;
  }
): Promise<void> {
  const minutes = proxyMinutes(line);
  const yards = totalYards(line);
  const isHome =
    meta.homeTeamName != null
      ? line.teamName.toLowerCase() === meta.homeTeamName.toLowerCase()
      : null;
  const opponentName =
    isHome === true ? meta.awayTeamName : isHome === false ? meta.homeTeamName : null;

  await upsertPlayerMatchStat({
    playerId,
    externalEventKey: footballMatchExternalKey(meta.league, meta.eventId),
    matchDate: meta.matchDate ?? undefined,
    competitionLabel: competitionLabel(meta.league),
    teamName: line.teamName,
    opponentName: opponentName ?? undefined,
    isHome,
    minutesPlayed: minutes,
    // Soccer-shared columns unused for AF (tackles/ints are real).
    goals: 0,
    assists: 0,
    tackles: line.tackles,
    interceptions: line.interceptions,
    passesCompleted: 0,
    passesAttempted: 0,
    // AF native
    passingYards: Math.round(line.passingYards),
    rushingYards: Math.round(line.rushingYards),
    receivingYards: Math.round(line.receivingYards),
    touchdowns: Math.round(line.touchdowns),
    sacks: line.sacks,
    totalYards: Math.round(yards),
    season: meta.season,
    source: `espn-${meta.league}`,
    ratingOverride: computeFootballMatchRating({
      minutesPlayed: minutes,
      totalYards: yards,
      touchdowns: line.touchdowns,
      tackles: line.tackles,
      sacks: line.sacks,
      interceptions: line.interceptions,
    }),
  });
}

export async function processFootballBoxScore(
  eventId: string,
  options: { force?: boolean; league?: FootballLeagueSlug } = {}
): Promise<ProcessFootballBoxScoreResult> {
  const league = options.league ?? "nfl";
  const prisma = getPrisma();
  const cacheKey = `${CACHE_PREFIX}${league}:${eventId}`;

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

  const detail = await fetchFootballMatchDetail(league, eventId);
  if (!detail) {
    throw new Error(`Football match ${eventId} not found on ESPN.`);
  }
  if (detail.status !== "finished") {
    throw new Error(`Partida ${eventId} ainda não finalizada na ESPN.`);
  }

  const lines = aggregateFootballBoxPlayers(detail.players);
  const season = resolveFootballBoxscoreSeason(league);
  let playersProcessed = 0;
  let statsUpdated = 0;
  let skipped = 0;
  let failed = 0;

  for (const line of lines) {
    playersProcessed += 1;
    if (!lineHasProduction(line)) {
      skipped += 1;
      continue;
    }

    try {
      const playerId = await resolvePlayerId(line.espnAthleteId);
      if (!playerId) {
        skipped += 1;
        continue;
      }

      await accumulateSeasonStats(playerId, line, season);
      if (isDbSource()) {
        await upsertMatchLine(playerId, line, {
          league,
          eventId,
          matchDate: detail.kickOff ? new Date(detail.kickOff) : null,
          homeTeamName: detail.homeTeam,
          awayTeamName: detail.awayTeam,
          season,
        });
      }
      statsUpdated += 1;
    } catch (error) {
      failed += 1;
      console.warn(`[boxscore-af] FAIL ${line.fullName}:`, error);
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

export async function syncTodaysFootballBoxScores(
  date = new Date(),
  options: { force?: boolean; league?: FootballLeagueSlug } = {}
): Promise<SyncFootballBoxScoresResult> {
  const league = options.league ?? "nfl";
  const events = await fetchScoreboard(league, date);
  const finalEvents = events.filter((e) => e.completed);
  const processed: ProcessFootballBoxScoreResult[] = [];

  for (const event of finalEvents) {
    try {
      const result = await processFootballBoxScore(event.id, {
        force: options.force,
        league,
      });
      processed.push(result);
    } catch (error) {
      console.warn(`[boxscore-af] event ${event.id}:`, error);
      processed.push({
        eventId: event.id,
        playersProcessed: 0,
        statsUpdated: 0,
        skipped: 0,
        failed: 1,
        alreadyProcessed: false,
      });
    }
  }

  return {
    date: formatEspnFootballDate(date),
    eventsFound: events.length,
    finalEvents: finalEvents.length,
    processed,
  };
}

/**
 * Lazy persist for match detail — known AF players only (no create).
 */
export async function persistFootballBoxScoresForKnownPlayers(
  detail: FootballMatchDetail,
  meta: {
    league: FootballLeagueSlug;
    eventId: string;
    season?: number | null;
  }
): Promise<{ upserted: number; skipped: number }> {
  if (!isDbSource() || detail.players.length === 0) {
    return { upserted: 0, skipped: detail.players.length };
  }

  const lines = aggregateFootballBoxPlayers(detail.players);
  const season = meta.season ?? resolveFootballBoxscoreSeason(meta.league);
  let upserted = 0;
  let skipped = 0;

  for (const line of lines) {
    if (!lineHasProduction(line)) {
      skipped += 1;
      continue;
    }
    const playerId = await resolvePlayerId(line.espnAthleteId);
    if (!playerId) {
      skipped += 1;
      continue;
    }
    try {
      await upsertMatchLine(playerId, line, {
        league: meta.league,
        eventId: meta.eventId,
        matchDate: detail.kickOff ? new Date(detail.kickOff) : null,
        homeTeamName: detail.homeTeam,
        awayTeamName: detail.awayTeam,
        season,
      });
      upserted += 1;
    } catch (error) {
      skipped += 1;
      console.warn(`[af-match-stat] upsert failed ${line.fullName}:`, error);
    }
  }

  return { upserted, skipped };
}

export { buildEspnEventKey, CACHE_PREFIX };
