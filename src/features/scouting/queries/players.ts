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

/** List views read Supabase only — photo enrichment runs on player detail pages. */
export const queryPlayers = cache(async (filters: PlayerFilters) => {
  await ensureRuntimeDataSource();
  return withSupabaseErrorLog("queryPlayers", () => getPlayerRepository().findMany(filters));
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
