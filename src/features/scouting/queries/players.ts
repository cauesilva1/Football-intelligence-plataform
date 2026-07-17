import { cache } from "react";
import { getPlayerRepository } from "@/features/scouting/repository";
import { logSupabaseError } from "@/lib/db-errors";
import { ensureRuntimeDataSource } from "@/lib/ensure-runtime-data-source";
import { getServerSport } from "@/lib/sport-server";
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

export const queryPlayerById = cache(async (id: string, season?: string) => {
  await ensureRuntimeDataSource();
  return withSupabaseErrorLog("queryPlayerById", () =>
    getPlayerRepository().findById(id, season ? { season } : undefined)
  );
});

export const queryAllPlayersLite = cache(
  async (options?: { take?: number; ensureIds?: string[]; search?: string }) => {
    await ensureRuntimeDataSource();
    const sport = await getServerSport();
    return withSupabaseErrorLog("queryAllPlayersLite", () =>
      getPlayerRepository().findLite(sport, options)
    );
  }
);

/** Autocomplete search for compare/reports — bounded, sport-scoped. */
export async function searchPlayersLite(options?: {
  search?: string;
  take?: number;
  ensureIds?: string[];
}) {
  await ensureRuntimeDataSource();
  const sport = await getServerSport();
  return withSupabaseErrorLog("searchPlayersLite", () =>
    getPlayerRepository().findLite(sport, {
      take: options?.take ?? 30,
      search: options?.search,
      ensureIds: options?.ensureIds,
    })
  );
}
