import { cache } from "react";
import { getDashboardRepository } from "@/features/scouting/repository";

export const queryDashboardOverview = cache(async () => {
  return getDashboardRepository().getOverview();
});
