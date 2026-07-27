import { cache } from "react";
import { buildSoccerIntelligenceProfile } from "@/lib/intelligence/soccer/build-soccer-intelligence-profile";
import { similarPositionGroup } from "@/features/scouting/lib/position-scorecard";
import { getPlayerRepository } from "@/features/scouting/repository";
import { ensureRuntimeDataSource } from "@/lib/ensure-runtime-data-source";
import type { PlayerIntelligenceProfile } from "@/lib/intelligence/soccer/types";

const INTELLIGENCE_POOL_TAKE = 400;

export const queryPlayerIntelligenceProfile = cache(
  async (playerId: string): Promise<PlayerIntelligenceProfile | null> => {
    await ensureRuntimeDataSource();
    const repo = getPlayerRepository();
    const player = await repo.findById(playerId);
    if (!player) return null;

    const sport = player.sport ?? "SOCCER";
    if (sport !== "SOCCER") {
      throw new Error(`Player intelligence profile is soccer-only (got ${sport}).`);
    }

    const pool = await repo.findSample("SOCCER", {
      positions: similarPositionGroup(player.position),
      take: INTELLIGENCE_POOL_TAKE,
    });

    return buildSoccerIntelligenceProfile(player, { comparablesPool: pool });
  }
);
