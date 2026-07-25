import { NextResponse } from "next/server";
import {
  cronMisconfiguredResponse,
  cronUnauthorizedResponse,
  isCronAuthorized,
} from "@/lib/cron/authorize-request";
import { runFootballDailySync } from "@/lib/cron/football-daily-sync";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET?.trim()) {
    return cronMisconfiguredResponse();
  }

  if (!isCronAuthorized(request)) {
    return cronUnauthorizedResponse();
  }

  try {
    const result = await runFootballDailySync();
    return NextResponse.json({ ok: true, sport: "american-football", ...result });
  } catch (error) {
    console.error("[api/cron/american-football]", error);
    const message = error instanceof Error ? error.message : "Cron american-football sync failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
