/**
 * Print a headless intelligence profile as JSON (soccer / basketball / AF).
 *
 * Usage:
 *   npm run intel:profile -- <playerId>
 */
import {
  similarBasketballPositionGroup,
  similarFootballPositionGroup,
  similarPositionGroup,
} from "@/features/scouting/lib/position-scorecard";
import { getPlayerRepository } from "@/features/scouting/repository";
import { ensureRuntimeDataSource } from "@/lib/ensure-runtime-data-source";
import { getIntelligenceEngine, supportsIntelligence } from "@/lib/intelligence/registry";
import type { Sport } from "@/lib/sport";

async function main() {
  const playerId = process.argv[2];
  if (!playerId) {
    console.error("Usage: npm run intel:profile -- <playerId>");
    process.exit(1);
  }

  await ensureRuntimeDataSource();
  const repo = getPlayerRepository();
  const player = await repo.findById(playerId);
  if (!player) {
    console.error(`Player not found: ${playerId}`);
    process.exit(1);
  }

  const sport = (player.sport ?? "SOCCER") as Sport;
  if (!supportsIntelligence(sport)) {
    console.error(`Intelligence engine not available for sport: ${sport}`);
    process.exit(1);
  }

  const engine = getIntelligenceEngine(sport)!;
  const positions =
    sport === "BASKETBALL"
      ? similarBasketballPositionGroup(player.position)
      : sport === "AMERICAN_FOOTBALL"
        ? similarFootballPositionGroup(player.position)
        : similarPositionGroup(player.position);

  const pool = await repo.findSample(sport, {
    positions,
    take: 400,
  });

  const profile = engine.buildProfile(player, { comparablesPool: pool });
  console.log(JSON.stringify(profile, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
