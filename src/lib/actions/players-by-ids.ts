"use server";

import { isDbSource } from "@/lib/data-source";
import { enrichPlayerIfNeeded } from "@/lib/api-sports";
import { getPlayerRepository } from "@/features/scouting/repository";
import type { Player } from "@/types";

export async function getPlayersByIds(ids: string[]): Promise<Player[]> {
  if (ids.length === 0) return [];

  const repo = getPlayerRepository();
  const unique = [...new Set(ids)];

  if (isDbSource() && process.env.APISPORTS_KEY?.trim()) {
    await Promise.all(
      unique.map((id) => enrichPlayerIfNeeded(id).catch(() => undefined))
    );
  }

  const players = await Promise.all(unique.map((id) => repo.findById(id)));
  const order = new Map(unique.map((id, index) => [id, index]));

  return players
    .filter((player): player is Player => Boolean(player))
    .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
}
