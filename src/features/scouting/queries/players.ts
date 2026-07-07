import { cache } from "react";
import { getPlayerRepository } from "@/features/scouting/repository";
import { enrichPlayerIfNeeded } from "@/lib/api-sports";
import { ensureRuntimeDataSource } from "@/lib/ensure-runtime-data-source";
import type { PlayerFilters } from "@/types";

export const queryPlayers = cache(async (filters: PlayerFilters) => {
  await ensureRuntimeDataSource();
  return getPlayerRepository().findMany(filters);
});

export const queryPlayerById = cache(async (id: string) => {
  await ensureRuntimeDataSource();
  try {
    await enrichPlayerIfNeeded(id);
  } catch (error) {
    console.warn("[api-sports] Falha ao enriquecer jogador:", error);
  }
  return getPlayerRepository().findById(id);
});

export const queryAllPlayersLite = cache(async () => {
  await ensureRuntimeDataSource();
  return getPlayerRepository().findLite();
});
