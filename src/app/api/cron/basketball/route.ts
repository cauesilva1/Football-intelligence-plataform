import { NextResponse } from "next/server";
import {
  cronMisconfiguredResponse,
  cronUnauthorizedResponse,
  isCronAuthorized,
} from "@/lib/cron/authorize-request";
import { runBasketballDailySync } from "@/lib/cron/basketball-daily-sync";

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
    const result = await runBasketballDailySync();
    return NextResponse.json({ ok: true, sport: "basketball", ...result });
  } catch (error) {
    console.error("[api/cron/basketball]", error);
    const message = error instanceof Error ? error.message : "Cron basketball sync failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
