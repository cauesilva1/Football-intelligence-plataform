import { NextResponse } from "next/server";
import {
  cronMisconfiguredResponse,
  cronUnauthorizedResponse,
  isCronAuthorized,
} from "@/lib/cron/authorize-request";
import { runSoccerBoxscoreBackfill } from "@/lib/cron/soccer-daily-sync";
import { ensureSoccerTeamApiSportsIds } from "@/lib/api/ensure-team-api-sports-ids";
import { enrichPlayerMatchDefense } from "@/lib/api/enrich-match-defense";
import { startFootballQuotaRun } from "@/lib/api-sports";
import { formatQuotaLog } from "@/lib/api-quota";
import { endCronRun, errorMessage, logCron, startCronRun } from "@/lib/cron/cron-log";
import { SOCCER_CRON_STAGE_BUDGET, deadlineFrom } from "@/lib/cron/soccer-stage-plan";
import { backfillSoccerShotCharts } from "@/lib/soccer/soccer-shot-sync";

export const dynamic = "force-dynamic";
/** Cover all configured leagues × last few days of finals + light defense enrich. */
export const maxDuration = 300;

/**
 * Daily soccer cron, three time-boxed stages inside the 300s window:
 *   1. ESPN (free) scoreboards + boxscores for the last 2 days (until ~150s),
 *   2. fixtures catalogue sync, stalest leagues first (until ~200s),
 *   3. API-Football defensive enrichment using the 100 calls/day quota — leagues in season
 *      first, the rest on a daily rotation, never below the minimum-remaining floor.
 * Boxscores run first so a slow fixtures sync can never starve them again.
 */
export async function GET(request: Request) {
  if (!process.env.CRON_SECRET?.trim()) {
    return cronMisconfiguredResponse();
  }

  if (!isCronAuthorized(request)) {
    return cronUnauthorizedResponse();
  }

  const startedAt = Date.now();
  startCronRun("cron-soccer", maxDuration * 1000, startedAt);
  logCron("run_start", { maxDurationSec: maxDuration });

  try {
    const quota = await startFootballQuotaRun();
    const result = await runSoccerBoxscoreBackfill({
      days: 2,
      deadlineAt: deadlineFrom(startedAt, SOCCER_CRON_STAGE_BUDGET.boxscoresUntilMs),
      fixturesDeadlineAt: deadlineFrom(startedAt, SOCCER_CRON_STAGE_BUDGET.fixturesUntilMs),
    });
    logCron("backfill_done", {
      processed: result.processed,
      cached: result.skipped,
      failed: result.failed,
      truncated: result.truncated,
      fixturesAttempted: result.fixtures?.attempted,
      fixturesDeferred: result.fixtures?.deferred.length,
    });

    let teams: Awaited<ReturnType<typeof ensureSoccerTeamApiSportsIds>> | undefined;
    let defense: Awaited<ReturnType<typeof enrichPlayerMatchDefense>> | undefined;

    if (!process.env.APISPORTS_KEY?.trim()) {
      quota.recordSkip("APISPORTS_KEY not set");
      console.warn("[api/cron/soccer] APISPORTS_KEY missing — API-Football enrichment skipped.");
    } else if (Date.now() - startedAt > SOCCER_CRON_STAGE_BUDGET.enrichmentStartsBeforeMs) {
      quota.recordSkip("no time left for enrichment");
      console.warn("[api/cron/soccer] No time left — API-Football enrichment deferred to tomorrow.");
    } else {
      // Map-first team ids (0 quota), then league sync only if quota remains.
      teams = await ensureSoccerTeamApiSportsIds({ syncLeagues: true, quota });

      const since = new Date();
      since.setUTCDate(since.getUTCDate() - 2);
      const sinceIso = since.toISOString().slice(0, 10);

      defense = await enrichPlayerMatchDefense({ since: sinceIso, quota });
    }

    const shotDeadlineMs = startedAt + maxDuration * 1000 - 20_000;
    let shotCharts: Awaited<ReturnType<typeof backfillSoccerShotCharts>> | undefined;
    if (Date.now() + 20_000 < shotDeadlineMs) {
      try {
        shotCharts = await backfillSoccerShotCharts({
          deadlineMs: shotDeadlineMs,
          log: (message) => console.log(`[api/cron/soccer] [shots] ${message}`),
        });
        for (const chart of shotCharts) {
          logCron("shots_league", {
            league: chart.slug,
            games: chart.gamesProcessed,
            shots: chart.shotsStored,
            pending: chart.deferred,
            failed: chart.failed,
          });
        }
      } catch (error) {
        logCron("shots_error", { error: errorMessage(error) }, "warn");
      }
    } else {
      logCron("shots_deferred", { reason: "no time left" });
    }

    const apiSportsQuota = quota.snapshot();
    console.log(`[api/cron/soccer] ${formatQuotaLog(apiSportsQuota)}`);
    logCron("run_done", { elapsedMs: Date.now() - startedAt });

    return NextResponse.json({
      ok: true,
      sport: "soccer",
      mode: "backfill-2d+defense",
      elapsedMs: Date.now() - startedAt,
      apiSportsQuota,
      ...result,
      teams,
      defense,
      shotCharts,
    });
  } catch (error) {
    console.error("[api/cron/soccer]", error);
    logCron("run_error", { error: errorMessage(error) }, "warn");
    const message = error instanceof Error ? error.message : "Cron soccer sync failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  } finally {
    endCronRun();
  }
}
