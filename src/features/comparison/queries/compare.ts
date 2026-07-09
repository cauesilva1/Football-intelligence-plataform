import { cache } from "react";
import { getPlayerRepository } from "@/features/scouting/repository";
import { ensureRuntimeDataSource } from "@/lib/ensure-runtime-data-source";

export const queryPlayersForComparison = cache(async (idA: string, idB: string) => {
  await ensureRuntimeDataSource();
  return getPlayerRepository().findForComparison(idA, idB);
});
