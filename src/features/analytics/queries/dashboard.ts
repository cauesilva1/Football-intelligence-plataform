import { cache } from "react";
import { getDashboardRepository } from "@/features/scouting/repository";
import { logSupabaseError } from "@/lib/db-errors";
import { ensureRuntimeDataSource } from "@/lib/ensure-runtime-data-source";

export const queryDashboardOverview = cache(async () => {
  await ensureRuntimeDataSource();
  try {
    return await getDashboardRepository().getOverview();
  } catch (error) {
    logSupabaseError("queryDashboardOverview", error);
    throw error;
  }
});
