import { processMatchBoxScore2026 } from "@/lib/api/espn-boxscore";

const ESPN_SLUG = "bra.1";
const SCOREBOARD_URL = `https://site.api.espn.com/apis/site/v2/sports/soccer/${ESPN_SLUG}/scoreboard`;
const LOG_PREFIX = "[cron-sync-2026]";

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

async function fetchScoreboard(date = new Date()): Promise<EspnScoreboardEvent[]> {
  const url = `${SCOREBOARD_URL}?dates=${formatEspnDate(date)}`;
  const response = await fetch(url, {
    headers: {
      "User-Agent": "football-intelligence-platform/1.0 (brasileirao-cron-2026)",
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(45_000),
  });

  if (!response.ok) {
    throw new Error(`ESPN scoreboard HTTP ${response.status}`);
  }

  const payload = (await response.json()) as EspnScoreboardResponse;
  return payload.events ?? [];
}

export async function runSoccerDailySync(date = new Date()): Promise<SoccerCronResult> {
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error("DATABASE_URL ausente. Configure .env antes de executar o cron.");
  }

  console.log(`${LOG_PREFIX} Buscando placares do dia na ESPN...`);
  const events = await fetchScoreboard(date);
  const finished = events.filter(isFinalEvent);

  console.log(`${LOG_PREFIX} Eventos: ${events.length} · finalizados: ${finished.length}`);

  const matches: SoccerCronMatchResult[] = [];
  let processed = 0;
  let skipped = 0;
  let failed = 0;

  for (const event of finished) {
    const matchId = event.id;
    const label = event.name ?? matchId;

    try {
      const result = await processMatchBoxScore2026(matchId);

      if (result.alreadyProcessed) {
        skipped += 1;
        matches.push({ matchId, label, status: "skipped" });
        console.log(`${LOG_PREFIX} SKIP cache: ${label} (${matchId})`);
        continue;
      }

      processed += 1;
      matches.push({
        matchId,
        label,
        status: "processed",
        playersProcessed: result.playersProcessed,
        statsUpserted: result.statsUpserted,
        playersCreated: result.playersCreated,
        failedPlayers: result.failed,
      });
      console.log(
        `${LOG_PREFIX} OK ${label} (${matchId}) — atletas: ${result.playersProcessed} · stats: ${result.statsUpserted} · criados: ${result.playersCreated} · falhas: ${result.failed}`
      );
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : String(error);
      matches.push({ matchId, label, status: "failed", error: message });
      console.warn(`${LOG_PREFIX} FAIL ${label} (${matchId}):`, error);
    }
  }

  console.log(
    `${LOG_PREFIX} Concluído — processados: ${processed} · já em cache: ${skipped} · falhas: ${failed}`
  );

  return {
    date: formatEspnDate(date),
    eventsFound: events.length,
    finalEvents: finished.length,
    processed,
    skipped,
    failed,
    matches,
  };
}
