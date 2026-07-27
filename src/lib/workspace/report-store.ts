import type { Prisma } from "@prisma/client";
import type { ScoutingReport } from "@/types";
import { getPrisma, withPrismaRetry } from "@/lib/prisma";
import { isDbSource } from "@/lib/data-source";

type ReportPayload = Pick<
  ScoutingReport,
  "playingStyle" | "tacticalFit" | "briefContext"
>;

function toPayload(report: ScoutingReport): Prisma.InputJsonValue {
  const payload: ReportPayload = {
    playingStyle: report.playingStyle,
    tacticalFit: report.tacticalFit,
    ...(report.briefContext ? { briefContext: report.briefContext } : {}),
  };
  return payload as unknown as Prisma.InputJsonValue;
}

function fromPayload(payload: unknown): ReportPayload | null {
  if (!payload || typeof payload !== "object") return null;
  const row = payload as Partial<ReportPayload>;
  if (!row.playingStyle || !row.tacticalFit) return null;
  return {
    playingStyle: row.playingStyle,
    tacticalFit: row.tacticalFit,
    ...(row.briefContext ? { briefContext: row.briefContext } : {}),
  };
}

function rowToReport(row: {
  id: string;
  playerId: string;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  recommendation: string;
  overallRating: number;
  generatedBy: string;
  createdAt: Date;
  payload: unknown;
}): ScoutingReport | null {
  const extras = fromPayload(row.payload);
  if (!extras) return null;

  return {
    id: row.id,
    playerId: row.playerId,
    summary: row.summary,
    strengths: row.strengths,
    weaknesses: row.weaknesses,
    recommendation: row.recommendation,
    overallRating: row.overallRating,
    generatedBy: row.generatedBy,
    createdAt: row.createdAt.toISOString(),
    playingStyle: extras.playingStyle,
    tacticalFit: extras.tacticalFit,
    ...(extras.briefContext ? { briefContext: extras.briefContext } : {}),
  };
}

export async function saveWorkspaceReport(
  deviceId: string | null,
  report: ScoutingReport
): Promise<void> {
  if (!isDbSource()) return;

  await withPrismaRetry(
    () =>
      getPrisma().scoutingReport.create({
        data: {
          id: report.id,
          playerId: report.playerId,
          deviceId: deviceId ?? undefined,
          summary: report.summary,
          strengths: report.strengths,
          weaknesses: report.weaknesses,
          recommendation: report.recommendation,
          overallRating: report.overallRating,
          generatedBy: report.generatedBy,
          createdAt: new Date(report.createdAt),
          payload: toPayload(report),
        },
      }),
    { label: "saveWorkspaceReport" }
  );
}

export async function listWorkspaceReportsForPlayer(
  playerId: string,
  deviceId?: string | null
): Promise<ScoutingReport[]> {
  if (!isDbSource()) return [];

  const rows = await withPrismaRetry(
    () =>
      getPrisma().scoutingReport.findMany({
        where: {
          playerId,
          ...(deviceId ? { OR: [{ deviceId }, { deviceId: null }] } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    { label: "listWorkspaceReportsForPlayer" }
  );

  return rows
    .map(rowToReport)
    .filter((report): report is ScoutingReport => report != null);
}

export async function listAllWorkspaceReports(deviceId?: string | null): Promise<ScoutingReport[]> {
  if (!isDbSource()) return [];

  const rows = await withPrismaRetry(
    () =>
      getPrisma().scoutingReport.findMany({
        where: deviceId ? { deviceId } : undefined,
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
    { label: "listAllWorkspaceReports" }
  );

  return rows
    .map(rowToReport)
    .filter((report): report is ScoutingReport => report != null);
}
