import {
  NBA_BOXSCORE_SEASON,
  syncTodaysBasketballBoxScores,
  formatEspnDate,
  type SyncBasketballBoxScoresResult,
  type BasketballLeagueSlug,
} from "@/lib/api/espn-basketball-boxscore";
import { syncEuroLeagueRecentBoxscores } from "@/lib/sync/euroleague-sync";

const LOG_PREFIX = "[BASKETBALL-CRON]";

export interface BasketballCronDayResult {
  label: string;
  summary: SyncBasketballBoxScoresResult;
  error?: string;
}

export interface BasketballCronResult {
  season: number;
  reference: string;
  window: { from: string; to: string };
  days: BasketballCronDayResult[];
  euroleague?: {
    gamesFound: number;
    processed: number;
    skipped: number;
    failed: number;
    statsUpdated: number;
  };
  totals: {
    eventsFound: number;
    finalEvents: number;
    processed: number;
    skipped: number;
    failed: number;
    statsUpdated: number;
  };
}

function shiftLocalDate(base: Date, days: number): Date {
  const date = new Date(base);
  date.setDate(date.getDate() + days);
  date.setHours(12, 0, 0, 0);
  return date;
}

export function buildBasketballScanDates(now = new Date(), days = 2): Date[] {
  const window = Math.max(1, Math.min(days, 90));
  const dates: Date[] = [];
  for (let offset = window - 1; offset >= 0; offset -= 1) {
    dates.push(shiftLocalDate(now, -offset));
  }
  return dates;
}

function logDaySummary(label: string, summary: SyncBasketballBoxScoresResult): void {
  console.log(
    `${LOG_PREFIX} ${label} (${summary.date}): ${summary.finalEvents}/${summary.eventsFound} jogos finalizados`
  );

  if (!summary.processed.length) {
    console.log(`${LOG_PREFIX} ${label}: nenhum jogo para processar.`);
    return;
  }

  for (const result of summary.processed) {
    if (result.alreadyProcessed) {
      console.log(`${LOG_PREFIX} SKIP cache: evento ${result.eventId}`);
      continue;
    }

    console.log(
      `${LOG_PREFIX} OK evento ${result.eventId} — stats: ${result.statsUpdated} · atletas: ${result.playersProcessed} · skip: ${result.skipped} · falhas: ${result.failed}`
    );
  }
}

function aggregateTotals(summaries: SyncBasketballBoxScoresResult[]) {
  return summaries.reduce(
    (acc, summary) => {
      for (const result of summary.processed) {
        if (result.alreadyProcessed) {
          acc.skipped += 1;
        } else {
          acc.processed += 1;
          acc.statsUpdated += result.statsUpdated;
          acc.failed += result.failed;
        }
      }
      acc.eventsFound += summary.eventsFound;
      acc.finalEvents += summary.finalEvents;
      return acc;
    },
    { processed: 0, skipped: 0, failed: 0, statsUpdated: 0, eventsFound: 0, finalEvents: 0 }
  );
}

export async function runBasketballDailySync(
  options: {
    force?: boolean;
    now?: Date;
    days?: number;
    /** Leagues to scan — default NBA + NCAA. */
    leagues?: BasketballLeagueSlug[];
  } = {}
): Promise<BasketballCronResult> {
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error("DATABASE_URL ausente. Configure .env antes de executar o cron.");
  }

  const now = options.now ?? new Date();
  const daysWindow = options.days ?? 2;
  const scanDates = buildBasketballScanDates(now, daysWindow);
  const leagues = options.leagues ?? (["nba", "mens-college-basketball"] as BasketballLeagueSlug[]);
  const days: BasketballCronDayResult[] = [];
  const summaries: SyncBasketballBoxScoresResult[] = [];

  console.log(`${LOG_PREFIX} Iniciando varredura diária...`);
  console.log(
    `${LOG_PREFIX} Referência: ${now.toISOString()} · janela: últimos ${daysWindow} dia(s) (${formatEspnDate(scanDates[0])} → ${formatEspnDate(scanDates[scanDates.length - 1])}) · ligas: ${leagues.join(",")}${options.force ? " · modo force" : ""}`
  );

  for (const date of scanDates) {
    const label = formatEspnDate(date);
    for (const league of leagues) {
      const dayLabel = `${label}:${league}`;
      console.log(`${LOG_PREFIX} Varredura — ${dayLabel}...`);

      try {
        const summary = await syncTodaysBasketballBoxScores(date, {
          force: options.force,
          league,
        });
        summaries.push(summary);
        days.push({ label: dayLabel, summary });
        logDaySummary(dayLabel, summary);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        days.push({
          label: dayLabel,
          summary: {
            date: formatEspnDate(date),
            eventsFound: 0,
            finalEvents: 0,
            processed: [],
          },
          error: message,
        });
        console.warn(`${LOG_PREFIX} FAIL ${dayLabel}:`, error);
      }
    }
  }

  const totals = aggregateTotals(summaries);

  let euroleague: BasketballCronResult["euroleague"];
  try {
    console.log(`${LOG_PREFIX} EuroLeague — últimos ${daysWindow} dia(s)…`);
    euroleague = await syncEuroLeagueRecentBoxscores({
      days: daysWindow,
      force: options.force,
      now,
    });
    totals.eventsFound += euroleague.gamesFound;
    totals.finalEvents += euroleague.gamesFound;
    totals.processed += euroleague.processed;
    totals.skipped += euroleague.skipped;
    totals.failed += euroleague.failed;
    totals.statsUpdated += euroleague.statsUpdated;
    console.log(
      `${LOG_PREFIX} EuroLeague OK — jogos ${euroleague.gamesFound} · novos ${euroleague.processed} · cache ${euroleague.skipped} · stats ${euroleague.statsUpdated}`
    );
  } catch (error) {
    console.warn(`${LOG_PREFIX} EuroLeague FAIL:`, error);
  }

  console.log(
    `${LOG_PREFIX} Concluído — temporadas: ${NBA_BOXSCORE_SEASON} · eventos: ${totals.eventsFound} · finalizados: ${totals.finalEvents} · novos: ${totals.processed} · cache: ${totals.skipped} · stats: ${totals.statsUpdated} · falhas: ${totals.failed}`
  );

  return {
    season: NBA_BOXSCORE_SEASON,
    reference: now.toISOString(),
    window: {
      from: formatEspnDate(scanDates[0]),
      to: formatEspnDate(scanDates[scanDates.length - 1]),
    },
    days,
    euroleague,
    totals,
  };
}

/** Multi-day basketball boxscore backfill (writes season averages + PlayerMatchStat). */
export async function runBasketballBoxscoreBackfill(options: {
  days: number;
  force?: boolean;
  endDate?: Date;
  leagues?: BasketballLeagueSlug[];
}): Promise<BasketballCronResult> {
  return runBasketballDailySync({
    days: options.days,
    force: options.force,
    now: options.endDate ?? new Date(),
    leagues: options.leagues,
  });
}
