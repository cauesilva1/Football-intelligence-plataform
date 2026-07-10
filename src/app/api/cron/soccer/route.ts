import { NextResponse } from "next/server";
import {
  cronMisconfiguredResponse,
  cronUnauthorizedResponse,
  isCronAuthorized,
} from "@/lib/cron/authorize-request";
import { runSoccerDailySync } from "@/lib/cron/soccer-daily-sync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET?.trim()) {
    return cronMisconfiguredResponse();
  }

  if (!isCronAuthorized(request)) {
    return cronUnauthorizedResponse();
  }

  try {
    const result = await runSoccerDailySync();
    return NextResponse.json({ ok: true, sport: "soccer", ...result });
  } catch (error) {
    console.error("[api/cron/soccer]", error);
    const message = error instanceof Error ? error.message : "Cron soccer sync failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
