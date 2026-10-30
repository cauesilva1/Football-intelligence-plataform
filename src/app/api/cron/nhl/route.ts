import { NextResponse } from "next/server";
import {
  cronMisconfiguredResponse,
  cronUnauthorizedResponse,
  isCronAuthorized,
} from "@/lib/cron/authorize-request";
import { runNhlDailySync } from "@/lib/cron/nhl-daily-sync";

export const maxDuration = 300;

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET?.trim()) {
    return cronMisconfiguredResponse();
  }

  if (!isCronAuthorized(request)) {
    return cronUnauthorizedResponse();
  }

  try {
    const result = await runNhlDailySync();
    return NextResponse.json({ ok: true, sport: "hockey", ...result });
  } catch (error) {
    console.error("[api/cron/nhl]", error);
    const message = error instanceof Error ? error.message : "Cron NHL sync failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
