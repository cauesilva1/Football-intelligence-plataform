import { cache } from "react";
import { getPlayerRepository } from "@/features/scouting/repository";
import type { Sport } from "@/lib/sport";

export function positionPoolKey(positions: string[]): string {
  return [...positions].sort().join("|");
}

/** One roster sample per request, shared by intelligence and similar players. */
export const queryPositionPool = cache(async (sport: Sport, positionsKey: string, take: number) => {
  const positions = positionsKey ? positionsKey.split("|") : [];
  return getPlayerRepository().findSample(sport, {
    ...(positions.length > 0 ? { positions } : {}),
    take,
  });
});
