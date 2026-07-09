import { cache } from "react";
import { getPlayerRepository } from "@/features/scouting/repository";
import { enrichPlayerIfNeeded } from "@/lib/api-sports";
import { isDbSource } from "@/lib/data-source";
import { logSupabaseError } from "@/lib/db-errors";
import { ensureRuntimeDataSource } from "@/lib/ensure-runtime-data-source";
import type { PlayerFilters } from "@/types";

async function withSupabaseErrorLog<T>(context: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    logSupabaseError(context, error);
    throw error;
  }
}

async function enrichPlayersOnPage(playerIds: string[]): Promise<void> {
  if (!isDbSource() || !process.env.APISPORTS_KEY?.trim() || playerIds.length === 0) return;

  await Promise.all(
    playerIds.map((id) => enrichPlayerIfNeeded(id).catch(() => undefined))
  );
}

export const queryPlayers = cache(async (filters: PlayerFilters) => {
  await ensureRuntimeDataSource();
  const result = await withSupabaseErrorLog("queryPlayers", () =>
    getPlayerRepository().findMany(filters)
  );

  await enrichPlayersOnPage(result.items.map((player) => player.id));
  if (isDbSource() && process.env.APISPORTS_KEY?.trim()) {
    return withSupabaseErrorLog("queryPlayers:refresh", () =>
      getPlayerRepository().findMany(filters)
    );
  }

  return result;
});

export const queryPlayerById = cache(async (id: string) => {
  await ensureRuntimeDataSource();
  if (isDbSource() && process.env.APISPORTS_KEY?.trim()) {
    try {
      await enrichPlayerIfNeeded(id);
    } catch (error) {
      console.warn("[api-sports] Player photo enrichment failed:", error);
    }
  }
  return withSupabaseErrorLog("queryPlayerById", () => getPlayerRepository().findById(id));
});

export const queryAllPlayersLite = cache(async () => {
  await ensureRuntimeDataSource();
  return withSupabaseErrorLog("queryAllPlayersLite", () => getPlayerRepository().findLite());
});
