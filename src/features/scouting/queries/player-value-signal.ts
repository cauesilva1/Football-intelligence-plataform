import { cache } from "react";
import {
  similarBasketballPositionGroup,
  similarFootballPositionGroup,
  similarPositionGroup,
} from "@/features/scouting/lib/position-scorecard";
import { getPlayerRepository } from "@/features/scouting/repository";
import { deriveAgePeerValueSignal, type ValueSignal } from "@/lib/intelligence/value-signals";
import { ensureRuntimeDataSource } from "@/lib/ensure-runtime-data-source";
import type { Sport } from "@/lib/sport";

const VALUE_COHORT_TAKE = 120;

function poolPositions(sport: Sport, position: string): string[] {
  if (sport === "BASKETBALL") return similarBasketballPositionGroup(position);
  if (sport === "AMERICAN_FOOTBALL") return similarFootballPositionGroup(position);
  return similarPositionGroup(position);
}

export const queryPlayerValueSignal = cache(
  async (playerId: string): Promise<ValueSignal | null> => {
    await ensureRuntimeDataSource();
    const repo = getPlayerRepository();
    const player = await repo.findById(playerId);
    if (!player) return null;

    const sport = (player.sport ?? "SOCCER") as Sport;
    const cohort = await repo.findSample(sport, {
      positions: poolPositions(sport, player.position),
      take: VALUE_COHORT_TAKE,
    });

    return deriveAgePeerValueSignal(player, cohort);
  }
);
