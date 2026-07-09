"use server";

import { getPlayerRepository } from "@/features/scouting/repository";
import type { Player } from "@/types";

export async function getPlayersByIds(ids: string[]): Promise<Player[]> {
  if (ids.length === 0) return [];

  const repo = getPlayerRepository();
  const unique = [...new Set(ids)];

  const players = await Promise.all(unique.map((id) => repo.findById(id)));
  const order = new Map(unique.map((id, index) => [id, index]));

  return players
    .filter((player): player is Player => Boolean(player))
    .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
}
