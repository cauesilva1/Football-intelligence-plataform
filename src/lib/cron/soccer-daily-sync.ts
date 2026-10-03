import { processMatchBoxScore } from "@/lib/api/espn-boxscore";
import { SOCCER_COMPETITIONS } from "@/lib/tournaments/soccer-competitions";
import { getPrisma, resetPrismaConnection, withPrismaRetry } from "@/lib/prisma";
import { errorMessage, logCron } from "@/lib/cron/cron-log";
import {
  interleaveRoundRobin,
  isPastDeadline,
  orderBySyncStaleness,
} from "@/lib/cron/soccer-stage-plan";

const LOG_PREFIX = "[cron-soccer-boxscores]";

interface EspnScoreboardEvent {
  id: string;
  name?: string;
  shortName?: string;
  status?: { type?: { name?: string; state?: string; completed?: boolean } };
  competitions?: Array<{
    status?: { type?: { name?: string; state?: string; completed?: boolean } };
    competitors?: Array<{
      team?: { displayName?: string; name?: string; shortDisplayName?: string };
    }>;
  }>;
}

interface EspnScoreboardResponse {
  events?: EspnScoreboardEvent[];
}

export interface SoccerCronMatchResult {
  matchId: string;
  espnSlug: string;
  label: string;
  status: "processed" | "skipped" | "failed";
  playersProcessed?: number;
  statsUpserted?: number;
  playersCreated?: number;
  failedPlayers?: number;
  error?: string;
}

export interface SoccerCronResult {
  date: string;
  leagues: number;
  eventsFound: number;
  finalEvents: number;
  processed: number;
  skipped: number;
  failed: number;
  /** True when the boxscore deadline stopped this day early. */
  truncated?: boolean;
  matches: SoccerCronMatchResult[];
}

function formatEspnDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

function isFinalEvent(event: EspnScoreboardEvent): boolean {
  const status = event.competitions?.[0]?.status?.type ?? event.status?.type;
  if (!status) return false;

  return (
    status.name === "STATUS_FINAL" ||
    status.completed === true ||
    status.state === "post"
  );
}

function espnSoccerLeagues() {
  return SOCCER_COMPETITIONS.filter(
    (c): c is typeof c & { espnSlug: string; seasonYear: number } =>
      Boolean(c.espnSlug && c.seasonYear)
  );
}

async function fetchScoreboard(
  espnSlug: string,
  date: Date
): Promise<EspnScoreboardEvent[]> {
  const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${espnSlug}/scoreboard?dates=${formatEspnDate(date)}`;
  const response = await fetch(url, {
    headers: {
      "User-Agent": "football-intelligence-platform/1.0 (soccer-multi-league-cron)",
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(45_000),
  });

  if (!response.ok) {
    throw new Error(`ESPN scoreboard HTTP ${response.status} for ${espnSlug}`);
  }

  const payload = (await response.json()) as EspnScoreboardResponse;
  return payload.events ?? [];
}

export type SoccerSyncOptions = {
  /** Restrict to one ESPN slug (e.g. ger.1). Default: all configured soccer leagues. */
  espnSlug?: string;
  /** Skip fixture catalogue sync (boxscores only). */
  skipFixtures?: boolean;
  /** Re-process even if systemCache marks the event done. */
  force?: boolean;
  /** Override competition seasonYear (e.g. 2024 for prior European season). */
  seasonYear?: number;
  /** Create players missing from roster (default true). Prefer false on short prior-season windows. */
  createMissingPlayers?: boolean;
  /**
   * Only process finals whose ESPN label/competitors match any of these substrings
   * (case-insensitive), e.g. ["Real Sociedad", "Real Madrid", "Bayern"].
   */
  teamNames?: string[];
  /** Epoch ms: stop starting new boxscores after this point (stage time budget). */
  deadlineAt?: number;
  /** Epoch ms: stop the fixtures stage after this point (stage time budget). */
  fixturesDeadlineAt?: number;
};

function eventMatchesTeams(event: EspnScoreboardEvent, teamNames?: string[]): boolean {
  if (!teamNames?.length) return true;
  const needles = teamNames.map((t) => t.trim().toLowerCase()).filter(Boolean);
  if (!needles.length) return true;

  const haystacks: string[] = [];
  if (event.name) haystacks.push(event.name);
  if (event.shortName) haystacks.push(event.shortName);
  for (const c of event.competitions?.[0]?.competitors ?? []) {
    const t = c.team;
    if (t?.displayName) haystacks.push(t.displayName);
    if (t?.name) haystacks.push(t.name);
    if (t?.shortDisplayName) haystacks.push(t.shortDisplayName);
  }
  const blob = haystacks.join(" | ").toLowerCase();
  return needles.some((n) => blob.includes(n));
}

function leaguesForSync(espnSlug?: string) {
  const all = espnSoccerLeagues();
  if (!espnSlug) return all;
  return all.filter((l) => l.espnSlug === espnSlug);
}

export type SoccerFixturesResult = {
  leagues: number;
  attempted: number;
  saved: number;
  /** Leagues not reached before the stage deadline; they go first on the next run. */
  deferred: string[];
  orphanStatsLinked: number;
  durationMs: number;
};

async function loadFixturesLastSyncedBySlug(): Promise<Map<string, Date>> {
  const prisma = getPrisma();
  const competitions = await prisma.competition.findMany({
    where: { espnSlug: { not: null } },
    select: { id: true, espnSlug: true },
  });
  const slugById = new Map(competitions.map((c) => [c.id, c.espnSlug as string]));
  const grouped = await prisma.match.groupBy({
    by: ["competitionId"],
    where: { source: "espn", competitionId: { in: [...slugById.keys()] } },
    _max: { updatedAt: true },
  });

  const bySlug = new Map<string, Date>();
  for (const row of grouped) {
    const slug = row.competitionId ? slugById.get(row.competitionId) : undefined;
    const at = row._max.updatedAt;
    if (!slug || !at) continue;
    const current = bySlug.get(slug);
    if (!current || at > current) bySlug.set(slug, at);
  }
  return bySlug;
}

/** Stats written before their Match row existed (boxscores run first) get linked afterwards. */
async function linkOrphanMatchStats(): Promise<number> {
  const prisma = getPrisma();
  return prisma.$executeRaw`
    UPDATE player_match_stats AS s
    SET "matchId" = m.id
    FROM matches AS m
    WHERE s."matchId" IS NULL
      AND s."externalEventKey" = m."externalKey"
  `;
}

/**
 * Fixture catalogue sync, time-boxed. Least recently synced leagues go first so every league
 * is reached over a few days even when a run only has time for some of them.
 */
export async function runSoccerFixturesSync(
  options: { espnSlug?: string; deadlineAt?: number } = {}
): Promise<SoccerFixturesResult> {
  const startedAt = Date.now();
  const configured = leaguesForSync(options.espnSlug);
  const result: SoccerFixturesResult = {
    leagues: configured.length,
    attempted: 0,
    saved: 0,
    deferred: [],
    orphanStatsLinked: 0,
    durationMs: 0,
  };

  let leagues = configured;
  try {
    leagues = orderBySyncStaleness(configured, await loadFixturesLastSyncedBySlug());
  } catch (error) {
    logCron("fixtures_order_error", { error: errorMessage(error) }, "warn");
  }

  try {
    const { syncEspnMatchesForCompetition, syncWorldCup2026Matches } = await import(
      "@/lib/api/espn-matches"
    );
    logCron("fixtures_stage_start", {
      leagues: leagues.length,
      order: leagues.map((l) => l.espnSlug).join(","),
    });

    for (const [index, league] of leagues.entries()) {
      if (isPastDeadline(options.deadlineAt)) {
        result.deferred = leagues.slice(index).map((l) => l.espnSlug);
        logCron(
          "fixtures_deadline_reached",
          { deferred: result.deferred.join(","), attempted: result.attempted },
          "warn"
        );
        break;
      }

      const leagueStartedAt = Date.now();
      result.attempted += 1;
      try {
        const saved =
          league.espnSlug === "fifa.world"
            ? await syncWorldCup2026Matches()
            : await syncEspnMatchesForCompetition(league.espnCompetitionLabel ?? league.name, {
                deadlineAt: options.deadlineAt,
              });
        result.saved += saved;
        console.log(`${LOG_PREFIX} Fixtures ${league.shortName} (${league.espnSlug}): ${saved}`);
        logCron("fixtures_league_done", {
          league: league.espnSlug,
          saved,
          durationMs: Date.now() - leagueStartedAt,
        });
      } catch (error) {
        console.warn(`${LOG_PREFIX} Fixtures sync failed for ${league.espnSlug}:`, error);
        logCron(
          "fixtures_league_error",
          {
            league: league.espnSlug,
            durationMs: Date.now() - leagueStartedAt,
            error: errorMessage(error),
          },
          "warn"
        );
      }
    }
  } catch (error) {
    console.warn(`${LOG_PREFIX} Fixtures sync import failed:`, error);
    logCron("fixtures_stage_import_error", { error: errorMessage(error) }, "warn");
  }

  try {
    result.orphanStatsLinked = await linkOrphanMatchStats();
  } catch (error) {
    logCron("link_orphan_stats_error", { error: errorMessage(error) }, "warn");
  }

  result.durationMs = Date.now() - startedAt;
  logCron("fixtures_stage_done", {
    attempted: result.attempted,
    deferred: result.deferred.length,
    saved: result.saved,
    orphanStatsLinked: result.orphanStatsLinked,
    durationMs: result.durationMs,
  });
  return result;
}

type PendingFinal = {
  league: ReturnType<typeof espnSoccerLeagues>[number];
  event: EspnScoreboardEvent;
};

/**
 * Scoreboards → ESPN boxscores for one calendar day. Fixtures run AFTER boxscores (unless
 * `skipFixtures`), so a slow catalogue sync can never starve the boxscore stage.
 */
export async function runSoccerDailySync(
  date = new Date(),
  options: SoccerSyncOptions = {}
): Promise<SoccerCronResult> {
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error("DATABASE_URL ausente. Configure .env antes de executar o cron.");
  }

  const leagues = leaguesForSync(options.espnSlug);
  if (leagues.length === 0) {
    throw new Error(`Nenhuma liga ESPN encontrada para slug=${options.espnSlug}`);
  }

  console.log(
    `${LOG_PREFIX} Scanning scoreboards for ${leagues.length} leagues on ${formatEspnDate(date)}...`
  );

  const matches: SoccerCronMatchResult[] = [];
  let eventsFound = 0;
  let finalEvents = 0;
  let processed = 0;
  let skipped = 0;
  let failed = 0;
  let truncated = false;

  logCron("boxscore_stage_start", {
    leagues: leagues.length,
    date: formatEspnDate(date),
    fixturesSkipped: Boolean(options.skipFixtures),
  });

  const perLeague = await Promise.all(
    leagues.map(async (league) => {
      const scoreboardStartedAt = Date.now();
      try {
        const events = await fetchScoreboard(league.espnSlug, date);
        const finalsAll = events.filter(isFinalEvent);
        const finished = finalsAll.filter((e) => eventMatchesTeams(e, options.teamNames));
        logCron("scoreboard_done", {
          league: league.espnSlug,
          date: formatEspnDate(date),
          events: events.length,
          finals: finalsAll.length,
          finalsAfterTeamFilter: finished.length,
          durationMs: Date.now() - scoreboardStartedAt,
        });
        return { league, events, finished };
      } catch (error) {
        console.warn(`${LOG_PREFIX} Scoreboard fail ${league.espnSlug}:`, error);
        logCron(
          "scoreboard_error",
          {
            league: league.espnSlug,
            date: formatEspnDate(date),
            durationMs: Date.now() - scoreboardStartedAt,
            error: errorMessage(error),
          },
          "warn"
        );
        return null;
      }
    })
  );

  const groups: PendingFinal[][] = [];
  for (const entry of perLeague) {
    if (!entry) continue;
    eventsFound += entry.events.length;
    finalEvents += entry.finished.length;
    groups.push(entry.finished.map((event) => ({ league: entry.league, event })));
  }
  const queue = interleaveRoundRobin(groups);

  for (const [position, { league, event }] of queue.entries()) {
    if (isPastDeadline(options.deadlineAt)) {
      truncated = true;
      logCron(
        "boxscore_deadline_reached",
        { date: formatEspnDate(date), attempted: position, pending: queue.length - position },
        "warn"
      );
      break;
    }

    const matchId = event.id;
    const label = event.name ?? matchId;
    const matchStartedAt = Date.now();

    try {
      const result = await withPrismaRetry(
        () =>
          processMatchBoxScore(league.espnSlug, matchId, {
            seasonYear: options.seasonYear ?? league.seasonYear,
            competitionLabel: league.espnCompetitionLabel ?? league.name,
            createMissingPlayers: options.createMissingPlayers ?? true,
            force: options.force,
          }),
        { label: `match:${league.espnSlug}:${matchId}`, attempts: 3 }
      );

      if (result.alreadyProcessed) {
        logCron("boxscore_cached", { league: league.espnSlug, eventId: matchId });
        skipped += 1;
        matches.push({
          matchId,
          espnSlug: league.espnSlug,
          label,
          status: "skipped",
        });
        continue;
      }

      processed += 1;
      matches.push({
        matchId,
        espnSlug: league.espnSlug,
        label,
        status: "processed",
        playersProcessed: result.playersProcessed,
        statsUpserted: result.statsUpserted,
        playersCreated: result.playersCreated,
        failedPlayers: result.failed,
      });
      console.log(
        `${LOG_PREFIX} OK ${league.shortName} ${label} — athletes: ${result.playersProcessed} · match rows: ${result.statsUpserted}`
      );
      logCron(
        result.statsUpserted === 0 ? "boxscore_written_empty" : "boxscore_written",
        {
          league: league.espnSlug,
          eventId: matchId,
          label,
          athletes: result.playersProcessed,
          rowsWritten: result.statsUpserted,
          playersCreated: result.playersCreated,
          playersSkippedNoMapping: result.skipped,
          playersFailed: result.failed,
          durationMs: Date.now() - matchStartedAt,
        },
        result.statsUpserted === 0 ? "warn" : "log"
      );

      // Long ESPN days idle the pooler — refresh after each finished match.
      await resetPrismaConnection();
      await getPrisma().$connect();
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : String(error);
      matches.push({
        matchId,
        espnSlug: league.espnSlug,
        label,
        status: "failed",
        error: message,
      });
      console.warn(`${LOG_PREFIX} FAIL ${league.espnSlug} ${label}:`, error);
      logCron(
        "boxscore_error",
        {
          league: league.espnSlug,
          eventId: matchId,
          label,
          durationMs: Date.now() - matchStartedAt,
          error: errorMessage(error),
        },
        "warn"
      );
    }
  }

  console.log(
    `${LOG_PREFIX} Done — leagues: ${leagues.length} · finals: ${finalEvents} · processed: ${processed} · cached: ${skipped} · failed: ${failed}`
  );
  logCron("boxscore_stage_done", {
    date: formatEspnDate(date),
    events: eventsFound,
    finals: finalEvents,
    processed,
    cached: skipped,
    failed,
    truncated,
  });

  if (!options.skipFixtures) {
    await runSoccerFixturesSync({
      espnSlug: options.espnSlug,
      deadlineAt: options.fixturesDeadlineAt,
    });
  }

  return {
    date: formatEspnDate(date),
    leagues: leagues.length,
    eventsFound,
    finalEvents,
    processed,
    skipped,
    failed,
    truncated,
    matches,
  };
}

export type SoccerBackfillResult = {
  days: number;
  dayResults: SoccerCronResult[];
  processed: number;
  skipped: number;
  failed: number;
  /** True when the boxscore deadline cut the run short; the rest is picked up next run. */
  truncated: boolean;
  fixtures?: SoccerFixturesResult;
};

/**
 * Walk backwards from `endDate` and process finished boxscores (fills Recent appearances),
 * then sync fixtures once. Both stages are time-boxed when deadlines are given.
 */
export async function runSoccerBoxscoreBackfill(options: {
  days: number;
  espnSlug?: string;
  /** Inclusive end of the window (defaults to today). Use season dates in the off-season. */
  endDate?: Date;
  force?: boolean;
  /** Override season year written to PlayerSeasonStats / cache keys. */
  seasonYear?: number;
  /** Prefer false on short prior-season windows to avoid flooding rosters with stubs. */
  createMissingPlayers?: boolean;
  /** Only process matches involving these team name substrings. */
  teamNames?: string[];
  /** Skip the fixtures stage entirely. */
  skipFixtures?: boolean;
  /** Epoch ms: boxscore stage budget. */
  deadlineAt?: number;
  /** Epoch ms: fixtures stage budget. */
  fixturesDeadlineAt?: number;
}): Promise<SoccerBackfillResult> {
  const days = Math.max(1, Math.min(options.days, 90));
  const end = options.endDate ?? new Date();
  const dayResults: SoccerCronResult[] = [];
  let processed = 0;
  let skipped = 0;
  let failed = 0;
  let truncated = false;

  for (let i = 0; i < days; i++) {
    if (isPastDeadline(options.deadlineAt)) {
      truncated = true;
      logCron("backfill_deadline_reached", { dayIndex: i, days }, "warn");
      break;
    }

    const date = new Date(end);
    date.setUTCDate(date.getUTCDate() - i);
    // Long backfills idle the pooler — refresh the client every calendar day.
    if (i > 0) {
      await resetPrismaConnection();
      await getPrisma().$connect();
    }
    const result = await runSoccerDailySync(date, {
      espnSlug: options.espnSlug,
      skipFixtures: true,
      force: options.force,
      seasonYear: options.seasonYear,
      createMissingPlayers: options.createMissingPlayers,
      teamNames: options.teamNames,
      deadlineAt: options.deadlineAt,
    });
    dayResults.push(result);
    processed += result.processed;
    skipped += result.skipped;
    failed += result.failed;
    if (result.truncated) truncated = true;
  }

  console.log(
    `${LOG_PREFIX} Backfill done — days: ${days} · processed: ${processed} · cached: ${skipped} · failed: ${failed}`
  );

  const fixtures = options.skipFixtures
    ? undefined
    : await runSoccerFixturesSync({
        espnSlug: options.espnSlug,
        deadlineAt: options.fixturesDeadlineAt,
      });

  return { days, dayResults, processed, skipped, failed, truncated, fixtures };
}
