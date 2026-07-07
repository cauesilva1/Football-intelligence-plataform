import { cache } from "react";
import { findSimilarPlayers } from "@/features/scouting/lib/similarity";
import { getPlayerRepository } from "@/features/scouting/repository";

export const querySimilarPlayers = cache(async (playerId: string, limit = 4) => {
  const repo = getPlayerRepository();
  const [target, all] = await Promise.all([repo.findById(playerId), repo.getAll()]);
  if (!target) return [];
  return findSimilarPlayers(target, all, limit);
});
