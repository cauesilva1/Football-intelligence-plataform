import type { ScoutingReport } from "@/lib/types";
import { readStore, updateStore } from "./file-store";

// ── Scouting Reports ─────────────────────────────────────

type ReportStore = Record<string, ScoutingReport[]>;

export async function getReportsForPlayerFromStore(
  playerId: string
): Promise<ScoutingReport[]> {
  const store = await readStore<ReportStore>("reports", {});
  return store[playerId] ?? [];
}

export async function saveReport(report: ScoutingReport): Promise<void> {
  await updateStore<ReportStore>("reports", {}, (store) => {
    const existing = store[report.playerId] ?? [];
    return { ...store, [report.playerId]: [report, ...existing] };
  });
}

export async function getAllReports(): Promise<ScoutingReport[]> {
  const store = await readStore<ReportStore>("reports", {});
  return Object.values(store).flat();
}
