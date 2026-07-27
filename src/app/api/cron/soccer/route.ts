import { NextResponse } from "next/server";
import {
  cronMisconfiguredResponse,
  cronUnauthorizedResponse,
  isCronAuthorized,
} from "@/lib/cron/authorize-request";
import { runSoccerBoxscoreBackfill } from "@/lib/cron/soccer-daily-sync";
import { ensureSoccerTeamApiSportsIds } from "@/lib/api/ensure-team-api-sports-ids";
import { enrichPlayerMatchDefense } from "@/lib/api/enrich-match-defense";

export const dynamic = "force-dynamic";
/** Cover all configured leagues × last few days of finals + light defense enrich. */
export const maxDuration = 300;

/**
 * Daily soccer cron: ESPN boxscores (last 2 days) then API-Football defensive
 * enrich for the same window (free-tier date access overlaps).
 */
export async function GET(request: Request) {
  if (!process.env.CRON_SECRET?.trim()) {
    return cronMisconfiguredResponse();
  }

  if (!isCronAuthorized(request)) {
    return cronUnauthorizedResponse();
  }

  try {
    const result = await runSoccerBoxscoreBackfill({ days: 2 });

    // Map-first team ids (0 quota), then league sync only if quota remains.
    const teams = await ensureSoccerTeamApiSportsIds({ syncLeagues: true });

    const since = new Date();
    since.setUTCDate(since.getUTCDate() - 2);
    const sinceIso = since.toISOString().slice(0, 10);

    const defense = await enrichPlayerMatchDefense({
      limit: 40,
      since: sinceIso,
    });

    return NextResponse.json({
      ok: true,
      sport: "soccer",
      mode: "backfill-2d+defense",
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
