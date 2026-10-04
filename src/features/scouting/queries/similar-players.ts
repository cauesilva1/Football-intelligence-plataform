import { cache } from "react";
import { findSimilarPlayers } from "@/features/scouting/lib/similarity";
import {
  similarBasketballPositionGroup,
  similarFootballPositionGroup,
  similarPositionGroup,
} from "@/features/scouting/lib/position-scorecard";
import { queryPlayerById } from "@/features/scouting/queries/players";
import { positionPoolKey, queryPositionPool } from "@/features/scouting/queries/player-pool";
import { ensureRuntimeDataSource } from "@/lib/ensure-runtime-data-source";

/** Cap candidates so similarity never hydrates the full sport roster. */
const SIMILAR_POOL_TAKE = 400;

export const querySimilarPlayers = cache(async (playerId: string, limit = 4) => {
  await ensureRuntimeDataSource();
  const target = await queryPlayerById(playerId);
  if (!target) return [];

  const sport = target.sport ?? "SOCCER";
  const positions =
    sport === "BASKETBALL"
      ? similarBasketballPositionGroup(target.position)
      : sport === "AMERICAN_FOOTBALL"
        ? similarFootballPositionGroup(target.position)
        : similarPositionGroup(target.position);

  const pool = await queryPositionPool(sport, positionPoolKey(positions), SIMILAR_POOL_TAKE);
  return findSimilarPlayers(target, pool, limit);
});
