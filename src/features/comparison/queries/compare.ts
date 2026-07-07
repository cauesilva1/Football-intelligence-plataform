import { cache } from "react";
import { getPlayerRepository } from "@/features/scouting/repository";
import { enrichPlayerIfNeeded } from "@/lib/api-sports";

export const queryPlayersForComparison = cache(async (idA: string, idB: string) => {
  await Promise.all([
    enrichPlayerIfNeeded(idA).catch(() => undefined),
    enrichPlayerIfNeeded(idB).catch(() => undefined),
  ]);
  return getPlayerRepository().findForComparison(idA, idB);
});
