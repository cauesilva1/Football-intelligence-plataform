import { cache } from "react";
import { findSimilarPlayers } from "@/features/scouting/lib/similarity";
import { getPlayerRepository } from "@/features/scouting/repository";
import { ensureRuntimeDataSource } from "@/lib/ensure-runtime-data-source";

export const querySimilarPlayers = cache(async (playerId: string, limit = 4) => {
  await ensureRuntimeDataSource();
  const repo = getPlayerRepository();
  const [target, all] = await Promise.all([repo.findById(playerId), repo.getAll()]);
  if (!target) return [];
  return findSimilarPlayers(target, all, limit);
});
