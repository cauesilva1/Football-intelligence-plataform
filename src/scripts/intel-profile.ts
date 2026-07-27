/**
 * Print a headless soccer intelligence profile as JSON.
 *
 * Usage:
 *   npm run intel:profile -- <playerId>
 */
import { buildSoccerIntelligenceProfile } from "@/lib/intelligence/soccer/build-soccer-intelligence-profile";
import { getPlayerRepository } from "@/features/scouting/repository";
import { ensureRuntimeDataSource } from "@/lib/ensure-runtime-data-source";
import { similarPositionGroup } from "@/features/scouting/lib/position-scorecard";

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

  const pool = await repo.findSample("SOCCER", {
    positions: similarPositionGroup(player.position),
    take: 400,
  });

  const profile = buildSoccerIntelligenceProfile(player, { comparablesPool: pool });
  console.log(JSON.stringify(profile, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
