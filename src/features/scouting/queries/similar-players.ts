import { cache } from "react";
import { findSimilarPlayers } from "@/features/scouting/lib/similarity";
import { getPlayerRepository } from "@/features/scouting/repository";
import { ensureRuntimeDataSource } from "@/lib/ensure-runtime-data-source";

export const querySimilarPlayers = cache(async (playerId: string, limit = 4) => {
  await ensureRuntimeDataSource();
  const repo = getPlayerRepository();
  const target = await repo.findById(playerId);
  if (!target) return [];

  const all = await repo.getAll(target.sport ?? "SOCCER");
  return findSimilarPlayers(target, all, limit);
});
