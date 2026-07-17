"use server";

import { getPlayerRepository } from "@/features/scouting/repository";
import { enforceActionRateLimit } from "@/lib/action-guard";
import { generateScoutingReport } from "@/lib/ai/scout-report-generator";
import { saveReport } from "@/lib/storage";
import type { ScoutingReport } from "@/types";

export async function createScoutingReport(playerId: string): Promise<ScoutingReport> {
  if (process.env.REPORTS_DISABLED === "1") {
    throw new Error("REPORTS_DISABLED");
  }
  if (!playerId?.trim()) {
    throw new Error("PLAYER_REQUIRED");
  }

  // 5 reports / 10 min per client IP — protects OpenRouter spend + DB writes.
  await enforceActionRateLimit("scout-report", { limit: 5, windowMs: 10 * 60_000 });

  const player = await getPlayerRepository().findById(playerId);
  if (!player) throw new Error(`PLAYER_NOT_FOUND:${playerId}`);

  const report = await generateScoutingReport(player);
  await saveReport(report);
  return report;
}

export async function getReportsForPlayer(playerId: string): Promise<ScoutingReport[]> {
  await new Promise((r) => setTimeout(r, 150));
  const { getReportsForPlayerFromStore } = await import("@/lib/storage");
  return getReportsForPlayerFromStore(playerId);
}
