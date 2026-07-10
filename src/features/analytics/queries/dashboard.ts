import { cache } from "react";
import { getDashboardRepository } from "@/features/scouting/repository";
import { logSupabaseError } from "@/lib/db-errors";
import { ensureRuntimeDataSource } from "@/lib/ensure-runtime-data-source";
import { getServerSport } from "@/lib/sport-server";

export const queryDashboardOverview = cache(async () => {
  await ensureRuntimeDataSource();
  const sport = await getServerSport();
  try {
    return await getDashboardRepository().getOverview(sport);
  } catch (error) {
    logSupabaseError("queryDashboardOverview", error);
    throw error;
  }
});
