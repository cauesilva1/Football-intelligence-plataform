"use server";

import { getPlayerRepository } from "@/features/scouting/repository";
import type { Player } from "@/types";

/** Cap batch size — Server Actions are callable from any client; protects DB pool. */
const MAX_IDS = 50;

export async function getPlayersByIds(ids: string[]): Promise<Player[]> {
  if (ids.length === 0) return [];

  const repo = getPlayerRepository();
  const unique = [...new Set(ids)].slice(0, MAX_IDS);

  const players = await Promise.all(unique.map((id) => repo.findById(id)));
  const order = new Map(unique.map((id, index) => [id, index]));

  return players
    .filter((player): player is Player => Boolean(player))
    .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
}
