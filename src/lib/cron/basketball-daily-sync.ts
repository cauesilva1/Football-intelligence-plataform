import {
  NBA_BOXSCORE_SEASON,
  syncTodaysBasketballBoxScores,
  formatEspnDate,
  type SyncBasketballBoxScoresResult,
} from "@/lib/api/espn-basketball-boxscore";

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

export function buildBasketballScanDates(now = new Date()): Date[] {
  return [shiftLocalDate(now, -1), shiftLocalDate(now, 0)];
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
  options: { force?: boolean; now?: Date } = {}
): Promise<BasketballCronResult> {
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error("DATABASE_URL ausente. Configure .env antes de executar o cron.");
  }

  const now = options.now ?? new Date();
  const scanDates = buildBasketballScanDates(now);
  const days: BasketballCronDayResult[] = [];
  const summaries: SyncBasketballBoxScoresResult[] = [];

  console.log(`${LOG_PREFIX} Iniciando varredura diária...`);
  console.log(
    `${LOG_PREFIX} Referência: ${now.toISOString()} · janela: ontem + hoje (${formatEspnDate(scanDates[0])} → ${formatEspnDate(scanDates[1])})${options.force ? " · modo force" : ""}`
  );

  for (const date of scanDates) {
    const label = date < shiftLocalDate(now, 0) ? "Dia anterior" : "Dia corrente";
    console.log(`${LOG_PREFIX} Varredura — ${label} (${formatEspnDate(date)})...`);

    try {
      const summary = await syncTodaysBasketballBoxScores(date, { force: options.force });
      summaries.push(summary);
      days.push({ label, summary });
      logDaySummary(label, summary);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      days.push({
        label,
        summary: {
          date: formatEspnDate(date),
          eventsFound: 0,
          finalEvents: 0,
          processed: [],
        },
        error: message,
      });
      console.warn(`${LOG_PREFIX} FAIL ${label} (${formatEspnDate(date)}):`, error);
    }
  }

  const totals = aggregateTotals(summaries);

  console.log(
    `${LOG_PREFIX} Concluído — temporadas: ${NBA_BOXSCORE_SEASON} · eventos: ${totals.eventsFound} · finalizados: ${totals.finalEvents} · novos: ${totals.processed} · cache: ${totals.skipped} · stats: ${totals.statsUpdated} · falhas: ${totals.failed}`
  );

  return {
    season: NBA_BOXSCORE_SEASON,
    reference: now.toISOString(),
    window: {
      from: formatEspnDate(scanDates[0]),
      to: formatEspnDate(scanDates[1]),
    },
    days,
    totals,
  };
}
