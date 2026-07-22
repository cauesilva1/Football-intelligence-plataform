/**
 * Stamp Team.apiSportsId for soccer clubs (static map + optional Big-5 /teams sync).
 *
 *   npm run data:ensure-team-apisports
 *   npm run data:ensure-team-apisports -- --map-only
 */
import { ensureSoccerTeamApiSportsIds } from "@/lib/api/ensure-team-api-sports-ids";

async function main() {
  const mapOnly = process.argv.includes("--map-only");
  console.log(`[ensure-team-apisports] mapOnly=${mapOnly}`);
  const result = await ensureSoccerTeamApiSportsIds({ syncLeagues: !mapOnly });
  console.log("[ensure-team-apisports] done", result);
}

main().catch((error) => {
  console.error("[ensure-team-apisports] fatal", error);
  process.exit(1);
});
