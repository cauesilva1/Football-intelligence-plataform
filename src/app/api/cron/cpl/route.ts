import { NextResponse } from "next/server";
import {
  cronMisconfiguredResponse,
  cronUnauthorizedResponse,
  isCronAuthorized,
} from "@/lib/cron/authorize-request";
import { startFootballQuotaRun } from "@/lib/api-sports";
import { formatQuotaLog } from "@/lib/api-quota";
import { endCronRun, errorMessage, logCron, startCronRun } from "@/lib/cron/cron-log";
import { CPL_SYNC_BUDGET_MS } from "@/lib/sync/cpl-plan";
import { runCplBackfill } from "@/lib/sync/cpl-sync";

export const dynamic = "force-dynamic";
/** Literal required by Next. Keep equal to CPL_CRON_MAX_DURATION_SEC. Teams + players only. */
export const maxDuration = 60;

/**
 * Weekly CPL roster backfill. Scheduled after the daily soccer cron so defensive
 * enrichment spends the football quota first. Stops on the shared safety floor.
 */
export async function GET(request: Request) {
  if (!process.env.CRON_SECRET?.trim()) {
    return cronMisconfiguredResponse();
  }

  if (!isCronAuthorized(request)) {
    return cronUnauthorizedResponse();
  }

  const startedAt = Date.now();
  startCronRun("cron-cpl", CPL_SYNC_BUDGET_MS, startedAt);
  logCron("run_start", { maxDurationSec: maxDuration });

  try {
    const quota = await startFootballQuotaRun();

    if (!process.env.APISPORTS_KEY?.trim()) {
      quota.recordSkip("APISPORTS_KEY not set");
      logCron("skipped", { reason: "missing API key" }, "warn");
      endCronRun();
      return NextResponse.json({ ok: true, stopped: "no-key", quota: quota.snapshot() });
    }

    if (!quota.canSpend(1)) {
      quota.recordSkip("CPL backfill: fewer than the minimum calls remain");
      logCron("skipped", { reason: "low-quota" }, "warn");
      endCronRun();
      return NextResponse.json({
        ok: true,
        stopped: "low-quota",
        quota: quota.snapshot(),
      });
    }

    const result = await runCplBackfill({
      deadlineAt: startedAt + CPL_SYNC_BUDGET_MS,
      quota,
    });
    console.log(`[api/cron/cpl] ${formatQuotaLog(quota.snapshot())}`);
    logCron("run_done", {
      stopped: result.stopped,
      squadsFetched: result.squadsFetched,
      playersUpserted: result.playersUpserted,
      elapsedMs: Date.now() - startedAt,
    });
    endCronRun();

    return NextResponse.json({ ok: true, ...result, quota: quota.snapshot() });
  } catch (error) {
    logCron("run_error", { message: errorMessage(error) }, "warn");
    endCronRun();
    console.error("[api/cron/cpl]", error);
    return NextResponse.json(
      { ok: false, error: errorMessage(error) },
      { status: 500 }
    );
  }
}
