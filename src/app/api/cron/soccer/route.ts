import { NextResponse } from "next/server";
import {
  cronMisconfiguredResponse,
  cronUnauthorizedResponse,
  isCronAuthorized,
} from "@/lib/cron/authorize-request";
import { runSoccerBoxscoreBackfill } from "@/lib/cron/soccer-daily-sync";

export const dynamic = "force-dynamic";
/** Cover all configured leagues × last few days of finals. */
export const maxDuration = 300;

/**
 * Daily soccer cron: fixtures + boxscores for the last 2 calendar days
 * (catches delayed ESPN finals). Requires CRON_SECRET bearer auth.
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
    return NextResponse.json({
      ok: true,
      sport: "soccer",
      mode: "backfill-2d",
      ...result,
    });
  } catch (error) {
    console.error("[api/cron/soccer]", error);
    const message = error instanceof Error ? error.message : "Cron soccer sync failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
