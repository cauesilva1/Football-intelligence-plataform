import { unstable_cache } from "next/cache";
import { cache } from "react";
import { getDashboardRepository } from "@/features/scouting/repository";
import { logSupabaseError } from "@/lib/db-errors";
import { ensureRuntimeDataSource } from "@/lib/ensure-runtime-data-source";
import { getServerSport } from "@/lib/sport-server";
import type { Sport } from "@/lib/sport";
import type { DashboardOverview } from "@/types";

const DASHBOARD_REVALIDATE_SECONDS = 180;

async function loadDashboardOverview(sport: Sport): Promise<DashboardOverview> {
  await ensureRuntimeDataSource();
  return getDashboardRepository().getOverview(sport);
}

/** Cross-request cache keyed by sport (cookie resolved outside the cached fn). */
function getCachedDashboardOverview(sport: Sport): Promise<DashboardOverview> {
  return unstable_cache(
    () => loadDashboardOverview(sport),
    ["dashboard-overview", sport],
    {
      revalidate: DASHBOARD_REVALIDATE_SECONDS,
      tags: ["dashboard", `dashboard-${sport}`],
    }
  )();
}

export const queryDashboardOverview = cache(async () => {
  const sport = await getServerSport();
  try {
    return await getCachedDashboardOverview(sport);
  } catch (error) {
    logSupabaseError("queryDashboardOverview", error);
    throw error;
  }
});
