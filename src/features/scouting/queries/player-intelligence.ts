import { cache } from "react";
import {
  similarBasketballPositionGroup,
  similarPositionGroup,
} from "@/features/scouting/lib/position-scorecard";
import { loadLeaguePercentileContext } from "@/features/scouting/queries/league-percentiles";
import { getPlayerRepository } from "@/features/scouting/repository";
import { getIntelligenceEngine, supportsIntelligence } from "@/lib/intelligence/registry";
import type { IntelligenceProfile } from "@/lib/intelligence/types";
import { ensureRuntimeDataSource } from "@/lib/ensure-runtime-data-source";
import type { Sport } from "@/lib/sport";

const INTELLIGENCE_POOL_TAKE = 400;

function poolPositions(sport: Sport, position: string): string[] {
  if (sport === "BASKETBALL") return similarBasketballPositionGroup(position);
  return similarPositionGroup(position);
}

export const queryPlayerIntelligenceProfile = cache(
  async (playerId: string): Promise<IntelligenceProfile | null> => {
    await ensureRuntimeDataSource();
    const repo = getPlayerRepository();
    const player = await repo.findById(playerId);
    if (!player) return null;

    const sport = (player.sport ?? "SOCCER") as Sport;
    if (!supportsIntelligence(sport)) {
      return null;
    }

    const engine = getIntelligenceEngine(sport);
    if (!engine) return null;

    const [pool, percentileTable] = await Promise.all([
      repo.findSample(sport, {
        positions: poolPositions(sport, player.position),
        take: INTELLIGENCE_POOL_TAKE,
      }),
      loadLeaguePercentileContext(player),
    ]);

    return engine.buildProfile(player, {
      comparablesPool: pool,
      percentileTable,
    });
  }
);
