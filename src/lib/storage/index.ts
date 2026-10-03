import type { ScoutingReport } from "@/lib/types";
import { isDbSource } from "@/lib/data-source";
import { getOrCreateDeviceId } from "@/lib/workspace/device-id";
import {
  listWorkspaceReportsForPlayer,
  saveWorkspaceReport,
} from "@/lib/workspace/report-store";
import { readStore, updateStore } from "./file-store";

// ── Scouting Reports ─────────────────────────────────────

type ReportStore = Record<string, ScoutingReport[]>;

export async function getReportsForPlayerFromStore(
  playerId: string
): Promise<ScoutingReport[]> {
  if (isDbSource()) {
    const deviceId = await getOrCreateDeviceId();
    return listWorkspaceReportsForPlayer(playerId, deviceId);
  }

  const store = await readStore<ReportStore>("reports", {});
  return store[playerId] ?? [];
}

export async function saveReport(report: ScoutingReport): Promise<void> {
  if (isDbSource()) {
    const deviceId = await getOrCreateDeviceId();
    await saveWorkspaceReport(deviceId, report);
    return;
  }

  await updateStore<ReportStore>("reports", {}, (store) => {
    const existing = store[report.playerId] ?? [];
    return { ...store, [report.playerId]: [report, ...existing] };
  });
}

export async function getAllReports(): Promise<ScoutingReport[]> {
  if (isDbSource()) return [];
  const store = await readStore<ReportStore>("reports", {});
  return Object.values(store).flat();
}
