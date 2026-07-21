import { processMatchBoxScore } from "@/lib/api/espn-boxscore";
import { SOCCER_COMPETITIONS } from "@/lib/tournaments/soccer-competitions";
import { getPrisma, resetPrismaConnection, withPrismaRetry } from "@/lib/prisma";

const LOG_PREFIX = "[cron-soccer-boxscores]";

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
};

function leaguesForSync(espnSlug?: string) {
  const all = espnSoccerLeagues();
  if (!espnSlug) return all;
  return all.filter((l) => l.espnSlug === espnSlug);
}

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

  if (!options.skipFixtures) {
    try {
      const { syncEspnMatchesForCompetition, syncWorldCup2026Matches } = await import(
        "@/lib/api/espn-matches"
      );
      for (const league of leagues) {
        try {
          const saved =
            league.espnSlug === "fifa.world"
              ? await syncWorldCup2026Matches()
              : await syncEspnMatchesForCompetition(league.espnCompetitionLabel ?? league.name);
          console.log(
            `${LOG_PREFIX} Fixtures ${league.shortName} (${league.espnSlug}): ${saved}`
          );
        } catch (error) {
          console.warn(`${LOG_PREFIX} Fixtures sync failed for ${league.espnSlug}:`, error);
        }
      }
    } catch (error) {
      console.warn(`${LOG_PREFIX} Fixtures sync import failed (continuing boxscores):`, error);
    }
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

  for (const league of leagues) {
    let events: EspnScoreboardEvent[] = [];
    try {
      events = await fetchScoreboard(league.espnSlug, date);
    } catch (error) {
      console.warn(`${LOG_PREFIX} Scoreboard fail ${league.espnSlug}:`, error);
      continue;
    }

    const finished = events.filter(isFinalEvent);
    eventsFound += events.length;
    finalEvents += finished.length;

    for (const event of finished) {
      const matchId = event.id;
      const label = event.name ?? matchId;

      try {
        const result = await withPrismaRetry(
          () =>
            processMatchBoxScore(league.espnSlug, matchId, {
              seasonYear: league.seasonYear,
              competitionLabel: league.espnCompetitionLabel ?? league.name,
              createMissingPlayers: true,
              force: options.force,
            }),
          { label: `match:${league.espnSlug}:${matchId}`, attempts: 3 }
        );

        if (result.alreadyProcessed) {
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
      }
    }
  }

  console.log(
    `${LOG_PREFIX} Done — leagues: ${leagues.length} · finals: ${finalEvents} · processed: ${processed} · cached: ${skipped} · failed: ${failed}`
  );

  return {
    date: formatEspnDate(date),
    leagues: leagues.length,
    eventsFound,
    finalEvents,
    processed,
    skipped,
    failed,
    matches,
  };
}

export type SoccerBackfillResult = {
  days: number;
  dayResults: SoccerCronResult[];
  processed: number;
  skipped: number;
  failed: number;
};

/** Walk backwards from `endDate` and process finished boxscores (fills Recent appearances). */
export async function runSoccerBoxscoreBackfill(options: {
  days: number;
  espnSlug?: string;
  /** Inclusive end of the window (defaults to today). Use season dates in the off-season. */
  endDate?: Date;
  force?: boolean;
}): Promise<SoccerBackfillResult> {
  const days = Math.max(1, Math.min(options.days, 90));
  const end = options.endDate ?? new Date();
  const dayResults: SoccerCronResult[] = [];
  let processed = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < days; i++) {
    const date = new Date(end);
    date.setUTCDate(date.getUTCDate() - i);
    // Long backfills idle the pooler — refresh the client every calendar day.
    if (i > 0) {
      await resetPrismaConnection();
      await getPrisma().$connect();
    }
    const result = await runSoccerDailySync(date, {
      espnSlug: options.espnSlug,
      skipFixtures: i > 0,
      force: options.force,
    });
    dayResults.push(result);
    processed += result.processed;
    skipped += result.skipped;
    failed += result.failed;
  }

  console.log(
    `${LOG_PREFIX} Backfill done — days: ${days} · processed: ${processed} · cached: ${skipped} · failed: ${failed}`
  );

  return { days, dayResults, processed, skipped, failed };
}
