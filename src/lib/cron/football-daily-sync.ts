import {
  syncTodaysFootballBoxScores,
  formatEspnFootballDate,
  resolveFootballBoxscoreSeason,
  type SyncFootballBoxScoresResult,
  type FootballLeagueSlug,
} from "@/lib/api/espn-football-boxscore";

const LOG_PREFIX = "[FOOTBALL-CRON]";

export interface FootballCronDayResult {
  label: string;
  summary: SyncFootballBoxScoresResult;
  error?: string;
}

export interface FootballCronResult {
  season: number;
  reference: string;
  window: { from: string; to: string };
  days: FootballCronDayResult[];
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

export function buildFootballScanDates(now = new Date(), days = 2): Date[] {
  const window = Math.max(1, Math.min(days, 90));
  const dates: Date[] = [];
  for (let offset = window - 1; offset >= 0; offset -= 1) {
    dates.push(shiftLocalDate(now, -offset));
  }
  return dates;
}

function aggregateTotals(summaries: SyncFootballBoxScoresResult[]) {
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

export async function runFootballDailySync(
  options: {
    force?: boolean;
    now?: Date;
    days?: number;
    leagues?: FootballLeagueSlug[];
  } = {}
): Promise<FootballCronResult> {
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error("DATABASE_URL ausente. Configure .env antes de executar o cron.");
  }

  const now = options.now ?? new Date();
  const daysWindow = options.days ?? 2;
  const scanDates = buildFootballScanDates(now, daysWindow);
  const leagues = options.leagues ?? (["nfl", "cfb"] as FootballLeagueSlug[]);
  const days: FootballCronDayResult[] = [];
  const summaries: SyncFootballBoxScoresResult[] = [];

  console.log(`${LOG_PREFIX} Iniciando varredura diária...`);
  console.log(
    `${LOG_PREFIX} Referência: ${now.toISOString()} · janela: últimos ${daysWindow} dia(s) (${formatEspnFootballDate(scanDates[0])} → ${formatEspnFootballDate(scanDates[scanDates.length - 1])}) · ligas: ${leagues.join(",")}${options.force ? " · modo force" : ""}`
  );

  for (const date of scanDates) {
    const label = formatEspnFootballDate(date);
    for (const league of leagues) {
      const dayLabel = `${label}:${league}`;
      console.log(`${LOG_PREFIX} Varredura — ${dayLabel}...`);

      try {
        const summary = await syncTodaysFootballBoxScores(date, {
          force: options.force,
          league,
        });
        summaries.push(summary);
        days.push({ label: dayLabel, summary });
        console.log(
          `${LOG_PREFIX} ${dayLabel}: ${summary.finalEvents}/${summary.eventsFound} jogos finalizados`
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        days.push({
          label: dayLabel,
          summary: {
            date: formatEspnFootballDate(date),
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
  const season = resolveFootballBoxscoreSeason("nfl", now);

  console.log(
    `${LOG_PREFIX} Concluído — temporada: ${season} · eventos: ${totals.eventsFound} · finalizados: ${totals.finalEvents} · novos: ${totals.processed} · cache: ${totals.skipped} · stats: ${totals.statsUpdated} · falhas: ${totals.failed}`
  );

  return {
    season,
    reference: now.toISOString(),
    window: {
      from: formatEspnFootballDate(scanDates[0]),
      to: formatEspnFootballDate(scanDates[scanDates.length - 1]),
    },
    days,
    totals,
  };
}

export async function runFootballBoxscoreBackfill(options: {
  days: number;
  force?: boolean;
  endDate?: Date;
  leagues?: FootballLeagueSlug[];
}): Promise<FootballCronResult> {
  return runFootballDailySync({
    days: options.days,
    force: options.force,
    now: options.endDate ?? new Date(),
    leagues: options.leagues,
  });
}
