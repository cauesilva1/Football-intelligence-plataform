"use server";

import { queryPlayers, queryPlayerById, queryAllPlayersLite } from "@/features/scouting/queries/players";
import { queryPlayersForComparison } from "@/features/comparison/queries/compare";
import type { Player, PlayerFilters, PaginatedResult } from "@/types";

async function simulateLatency(ms = 350) {
  if (process.env.DATA_SOURCE !== "db") {
    await new Promise((r) => setTimeout(r, ms));
  }
}

/** @deprecated Prefer queryPlayers in Server Components */
export async function getPlayers(filters: PlayerFilters = {}): Promise<PaginatedResult<Player>> {
  await simulateLatency();
  return queryPlayers(filters);
}

export async function getPlayer(id: string): Promise<Player> {
  await simulateLatency(250);
  const player = await queryPlayerById(id);
  if (!player) throw new Error(`PLAYER_NOT_FOUND:${id}`);
  return player;
}

export async function getPlayersForComparison(idA: string, idB: string): Promise<[Player, Player]> {
  await simulateLatency(300);
  const pair = await queryPlayersForComparison(idA, idB);
  if (!pair) throw new Error("PLAYER_NOT_FOUND");
  return pair;
}

export async function getAllPlayersLite() {
  await simulateLatency(150);
  return queryAllPlayersLite();
}
