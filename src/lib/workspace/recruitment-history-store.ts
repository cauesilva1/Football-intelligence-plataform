import type { Prisma } from "@prisma/client";
import type { RecruitmentBrief } from "@/lib/intelligence/soccer/recruitment-types";
import { getPrisma, withPrismaRetry } from "@/lib/prisma";
import { isDbSource } from "@/lib/data-source";

export interface RecruitmentBriefRunSummary {
  id: string;
  brief: RecruitmentBrief;
  totalEvaluated: number;
  resultCount: number;
  createdAt: string;
}

export async function saveRecruitmentBriefRun(
  deviceId: string,
  input: {
    brief: RecruitmentBrief;
    totalEvaluated: number;
    resultCount: number;
  }
): Promise<void> {
  if (!isDbSource()) return;

  await withPrismaRetry(
    () =>
      getPrisma().recruitmentBriefRun.create({
        data: {
          deviceId,
          brief: input.brief as unknown as Prisma.InputJsonValue,
          totalEvaluated: input.totalEvaluated,
          resultCount: input.resultCount,
        },
      }),
    { label: "saveRecruitmentBriefRun" }
  );
}

export async function listRecruitmentBriefRuns(
  deviceId: string,
  limit = 10
): Promise<RecruitmentBriefRunSummary[]> {
  if (!isDbSource()) return [];

  const rows = await withPrismaRetry(
    () =>
      getPrisma().recruitmentBriefRun.findMany({
        where: { deviceId },
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
    { label: "listRecruitmentBriefRuns" }
  );

  return rows.map((row) => ({
    id: row.id,
    brief: row.brief as unknown as RecruitmentBrief,
    totalEvaluated: row.totalEvaluated,
    resultCount: row.resultCount,
    createdAt: row.createdAt.toISOString(),
  }));
}
