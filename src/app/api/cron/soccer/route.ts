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

export const dynamic = "force-dynamic";
/** Cover all configured leagues × last few days of finals + light defense enrich. */
export const maxDuration = 300;

/** Stop starting paid enrichment this late in the 300s function window. */
const ENRICHMENT_DEADLINE_MS = 240_000;

/**
 * Daily soccer cron: ESPN (free) boxscores for the last 2 days, then API-Football
 * defensive enrichment using the 100 calls/day quota — leagues in season first, the
 * rest on a daily rotation, never below the minimum-remaining floor.
 */
export async function GET(request: Request) {
  if (!process.env.CRON_SECRET?.trim()) {
    return cronMisconfiguredResponse();
  }

  if (!isCronAuthorized(request)) {
    return cronUnauthorizedResponse();
  }

  const startedAt = Date.now();

  try {
    const quota = await startFootballQuotaRun();
    const result = await runSoccerBoxscoreBackfill({ days: 2 });

    let teams: Awaited<ReturnType<typeof ensureSoccerTeamApiSportsIds>> | undefined;
    let defense: Awaited<ReturnType<typeof enrichPlayerMatchDefense>> | undefined;

    if (!process.env.APISPORTS_KEY?.trim()) {
      quota.recordSkip("APISPORTS_KEY not set");
      console.warn("[api/cron/soccer] APISPORTS_KEY missing — API-Football enrichment skipped.");
    } else if (Date.now() - startedAt > ENRICHMENT_DEADLINE_MS) {
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

    const apiSportsQuota = quota.snapshot();
    console.log(`[api/cron/soccer] ${formatQuotaLog(apiSportsQuota)}`);

    return NextResponse.json({
      ok: true,
      sport: "soccer",
      mode: "backfill-2d+defense",
      elapsedMs: Date.now() - startedAt,
      apiSportsQuota,
      ...result,
      teams,
      defense,
    });
  } catch (error) {
    console.error("[api/cron/soccer]", error);
    const message = error instanceof Error ? error.message : "Cron soccer sync failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
