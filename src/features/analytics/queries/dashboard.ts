import { cache } from "react";
import { getDashboardRepository } from "@/features/scouting/repository";
import { ensureRuntimeDataSource } from "@/lib/ensure-runtime-data-source";

export const queryDashboardOverview = cache(async () => {
  await ensureRuntimeDataSource();
  return getDashboardRepository().getOverview();
});
