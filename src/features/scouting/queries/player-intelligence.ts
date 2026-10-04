import { cache } from "react";
import {
  similarBasketballPositionGroup,
  similarFootballPositionGroup,
  similarPositionGroup,
} from "@/features/scouting/lib/position-scorecard";
import { loadLeaguePercentileContext } from "@/features/scouting/queries/league-percentiles";
import { queryPlayerById } from "@/features/scouting/queries/players";
import { positionPoolKey, queryPositionPool } from "@/features/scouting/queries/player-pool";
import { deriveDataDepthSnapshot } from "@/lib/intelligence/data-depth";
import { getIntelligenceEngine, supportsIntelligence } from "@/lib/intelligence/registry";
import type { IntelligenceProfile } from "@/lib/intelligence/types";
import { ensureRuntimeDataSource } from "@/lib/ensure-runtime-data-source";
import type { Sport } from "@/lib/sport";

const INTELLIGENCE_POOL_TAKE = 400;

function poolPositions(sport: Sport, position: string): string[] {
  if (sport === "BASKETBALL") return similarBasketballPositionGroup(position);
  if (sport === "AMERICAN_FOOTBALL") return similarFootballPositionGroup(position);
  return similarPositionGroup(position);
}

export const queryPlayerIntelligenceProfile = cache(
  async (playerId: string): Promise<IntelligenceProfile | null> => {
    await ensureRuntimeDataSource();
    const player = await queryPlayerById(playerId);
    if (!player) return null;

    const sport = (player.sport ?? "SOCCER") as Sport;
    if (!supportsIntelligence(sport)) {
      return null;
    }

    const engine = getIntelligenceEngine(sport);
    if (!engine) return null;

    const positions = poolPositions(sport, player.position);
    const [pool, percentileTable] = await Promise.all([
      queryPositionPool(sport, positionPoolKey(positions), INTELLIGENCE_POOL_TAKE),
      loadLeaguePercentileContext(player),
    ]);

    const profile = engine.buildProfile(player, {
      comparablesPool: pool,
      percentileTable,
    });

    return {
      ...profile,
      dataDepth: deriveDataDepthSnapshot(player),
    };
  }
);
