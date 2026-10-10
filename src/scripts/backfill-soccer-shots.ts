/**
 * One capped pass of the soccer shot-chart queue (MLS first).
 * Usage: npx tsx src/scripts/backfill-soccer-shots.ts
 */
import { backfillSoccerShotCharts } from "@/lib/soccer/soccer-shot-sync";

async function main() {
  const results = await backfillSoccerShotCharts({
    deadlineMs: Date.now() + 12 * 60_000,
    log: (message) => console.log(`[soccer-shots] ${message}`),
  });
  console.log(JSON.stringify(results, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
