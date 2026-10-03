import {
  syncTodaysBasketballBoxScores,
  formatEspnDate,
  type SyncBasketballBoxScoresResult,
  type BasketballLeagueSlug,
} from "@/lib/api/espn-basketball-boxscore";
import { resolveNbaBoxscoreSeason } from "@/lib/basketball/season";
import { formatQuotaLog, type ApiQuotaSnapshot } from "@/lib/api-quota";
import {
  checkEuroLeagueOutage,
  startBasketballQuotaRun,
  type EuroLeagueOutageReport,
} from "@/lib/api/api-basketball";
import { EuroLeagueApiError } from "@/lib/api/euroleague";
import {
  ensureEuroLeagueCompetition,
  syncEuroLeagueClubs,
  syncEuroLeagueRecentBoxscores,
  syncEuroLeagueRosters,
  type EuroLeagueRosterSyncResult,
} from "@/lib/sync/euroleague-sync";
import { syncNbaRosters, type NbaRosterSyncResult } from "@/lib/sync/nba-roster-sync";

const LOG_PREFIX = "[BASKETBALL-CRON]";

/** Vercel maxDuration is 300s; stop starting new work 30s before. */
const DEFAULT_BUDGET_MS = 270_000;
/** EuroLeague roster refresh must start before this share of the budget is spent. */
const EUROLEAGUE_ROSTER_BUDGET_SHARE = 0.55;
/** Games per run when catching up on uncached EuroLeague results. */
const EUROLEAGUE_CATCHUP_GAMES = 15;
/** Minimum remaining time worth starting a roster step. */
const MIN_STEP_MS = 25_000;

export interface BasketballCronRosterResult {
  euroleague?: { clubs: number } & EuroLeagueRosterSyncResult;
  nba?: NbaRosterSyncResult;
  skipped: string[];
}

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
  rosters: BasketballCronRosterResult;
  /** Set only when the official EuroLeague API failed and API-Basketball was consulted. */
  euroleagueOutage?: EuroLeagueOutageReport;
  /** API-Basketball (paid, 100 req/day) usage for this run. */
  apiSportsQuota: ApiQuotaSnapshot;
  elapsedMs: number;
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
    /** Skip roster steps (backfills only need boxscores). */
    skipRosters?: boolean;
    /** Total wall-clock budget; defaults to 270s of the 300s route limit. */
    budgetMs?: number;
  } = {}
): Promise<BasketballCronResult> {
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error("DATABASE_URL ausente. Configure .env antes de executar o cron.");
  }

  const startedAt = Date.now();
  const budgetMs = options.budgetMs ?? DEFAULT_BUDGET_MS;
  const deadlineMs = startedAt + budgetMs;
  const remainingMs = () => deadlineMs - Date.now();
  const now = options.now ?? new Date();
  const season = resolveNbaBoxscoreSeason(now);
  const apiBasketballQuota = await startBasketballQuotaRun();
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
  console.log(
    `${LOG_PREFIX} [1/4] NBA/NCAA boxscores concluídos — ${Math.round((Date.now() - startedAt) / 1000)}s · restante ${Math.round(remainingMs() / 1000)}s`
  );

  const rosters: BasketballCronRosterResult = { skipped: [] };
  const runRosters = !options.skipRosters;

  if (!runRosters) {
    rosters.skipped.push("euroleague-rosters", "nba-rosters");
  } else if (remainingMs() < MIN_STEP_MS) {
    rosters.skipped.push("euroleague-rosters");
    console.warn(`${LOG_PREFIX} [2/4] EuroLeague elencos adiados — sem orçamento de tempo.`);
  } else {
    try {
      console.log(`${LOG_PREFIX} [2/4] EuroLeague clubes + elencos…`);
      const competitionId = await ensureEuroLeagueCompetition();
      if (!competitionId) throw new Error("Banco indisponível para EuroLeague.");
      const clubs = await syncEuroLeagueClubs(competitionId);
      const roster = await syncEuroLeagueRosters(competitionId, {
        force: options.force,
        deadlineMs: startedAt + budgetMs * EUROLEAGUE_ROSTER_BUDGET_SHARE,
      });
      rosters.euroleague = { clubs, ...roster };
      console.log(
        `${LOG_PREFIX} [2/4] EuroLeague elencos OK — clubes ${clubs} · jogadores ${roster.upserted}/${roster.total} (recentes: ${roster.skippedFresh})${roster.timedOut ? " · adiados por tempo" : ""}`
      );
    } catch (error) {
      console.warn(`${LOG_PREFIX} [2/4] EuroLeague elencos FAIL:`, error);
    }
  }

  let euroleague: BasketballCronResult["euroleague"];
  let euroleagueOutage: EuroLeagueOutageReport | undefined;
  try {
    const catchUp = options.days === undefined && !options.force;
    console.log(
      catchUp
        ? `${LOG_PREFIX} [3/4] EuroLeague boxscores — recuperando jogos pendentes (até ${EUROLEAGUE_CATCHUP_GAMES})…`
        : `${LOG_PREFIX} [3/4] EuroLeague boxscores — últimos ${daysWindow} dia(s)…`
    );
    euroleague = await syncEuroLeagueRecentBoxscores({
      days: daysWindow,
      force: options.force,
      now,
      deadlineMs: startedAt + budgetMs * 0.85,
      ...(catchUp ? { allPlayed: true, limit: EUROLEAGUE_CATCHUP_GAMES } : {}),
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
    // Only an official-feed outage uses the paid API-Basketball quota (≤ 1 call/day checked).
    if (error instanceof EuroLeagueApiError && !options.skipRosters) {
      try {
        euroleagueOutage = await checkEuroLeagueOutage({ reason: error.message, now, days: daysWindow });
        console.warn(
          `${LOG_PREFIX} EuroLeague fora do ar — API-Basketball: ${euroleagueOutage.finishedGames} jogo(s) finalizado(s) em ${euroleagueOutage.datesChecked.length} dia(s)${euroleagueOutage.skipped ? ` · ${euroleagueOutage.skipped}` : ""}`
        );
      } catch (fallbackError) {
        console.warn(`${LOG_PREFIX} EuroLeague outage check FAIL:`, fallbackError);
      }
    }
  }

  if (runRosters) {
    if (remainingMs() < MIN_STEP_MS) {
      rosters.skipped.push("nba-rosters");
      console.warn(`${LOG_PREFIX} [4/4] NBA elencos adiados — sem orçamento de tempo.`);
    } else {
      try {
        console.log(
          `${LOG_PREFIX} [4/4] NBA franquias + elencos — restante ${Math.round(remainingMs() / 1000)}s…`
        );
        rosters.nba = await syncNbaRosters({
          now,
          force: options.force,
          deadlineMs,
          log: (message) => console.log(`${LOG_PREFIX} [4/4] ${message}`),
        });
      } catch (error) {
        console.warn(`${LOG_PREFIX} [4/4] NBA elencos FAIL:`, error);
      }
    }
  }

  const elapsedMs = Date.now() - startedAt;
  const apiSportsQuota = apiBasketballQuota.snapshot();
  console.log(`${LOG_PREFIX} ${formatQuotaLog(apiSportsQuota)}`);
  console.log(
    `${LOG_PREFIX} Concluído em ${Math.round(elapsedMs / 1000)}s — temporada: ${season} · eventos: ${totals.eventsFound} · finalizados: ${totals.finalEvents} · novos: ${totals.processed} · cache: ${totals.skipped} · stats: ${totals.statsUpdated} · falhas: ${totals.failed}`
  );

  return {
    season,
    reference: now.toISOString(),
    window: {
      from: formatEspnDate(scanDates[0]),
      to: formatEspnDate(scanDates[scanDates.length - 1]),
    },
    days,
    euroleague,
    rosters,
    euroleagueOutage,
    apiSportsQuota,
    elapsedMs,
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
    skipRosters: true,
  });
}
