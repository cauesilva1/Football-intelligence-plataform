import { cache } from "react";
import { findSimilarPlayers } from "@/features/scouting/lib/similarity";
import { getPlayerRepository } from "@/features/scouting/repository";
import { ensureRuntimeDataSource } from "@/lib/ensure-runtime-data-source";

/** Cap candidates so similarity never hydrates the full sport roster. */
const SIMILAR_POOL_TAKE = 400;

export const querySimilarPlayers = cache(async (playerId: string, limit = 4) => {
  await ensureRuntimeDataSource();
  const repo = getPlayerRepository();
  const target = await repo.findById(playerId);
  if (!target) return [];

  const pool = await repo.findSample(target.sport ?? "SOCCER", {
    position: target.position,
    take: SIMILAR_POOL_TAKE,
  });
  return findSimilarPlayers(target, pool, limit);
});
