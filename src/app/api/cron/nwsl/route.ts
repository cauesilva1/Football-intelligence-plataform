import { NextResponse } from "next/server";
import {
  cronMisconfiguredResponse,
  cronUnauthorizedResponse,
  isCronAuthorized,
} from "@/lib/cron/authorize-request";
import { endCronRun, errorMessage, logCron, startCronRun } from "@/lib/cron/cron-log";
import { NWSL_SYNC_BUDGET_MS } from "@/lib/sync/nwsl-plan";
import { runNwslBackfill } from "@/lib/sync/nwsl-sync";

export const dynamic = "force-dynamic";
/** Literal required by Next. Keep equal to NWSL_CRON_MAX_DURATION_SEC. Teams + rosters only. */
export const maxDuration = 60;

/**
 * Weekly NWSL roster backfill from ESPN. Not part of the daily soccer cron,
 * so it cannot add fixtures or consume the 300s budget.
 */
export async function GET(request: Request) {
  if (!process.env.CRON_SECRET?.trim()) {
    return cronMisconfiguredResponse();
  }

  if (!isCronAuthorized(request)) {
    return cronUnauthorizedResponse();
  }

  const startedAt = Date.now();
  startCronRun("cron-nwsl", NWSL_SYNC_BUDGET_MS, startedAt);
  logCron("run_start", { maxDurationSec: maxDuration });

  try {
    const result = await runNwslBackfill({
      deadlineAt: startedAt + NWSL_SYNC_BUDGET_MS,
    });
    logCron("run_done", {
      stopped: result.stopped,
      squadsFetched: result.squadsFetched,
      playersUpserted: result.playersUpserted,
      elapsedMs: Date.now() - startedAt,
    });
    endCronRun();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    logCron("run_error", { message: errorMessage(error) }, "warn");
    endCronRun();
    console.error("[api/cron/nwsl]", error);
    return NextResponse.json({ ok: false, error: errorMessage(error) }, { status: 500 });
  }
}
