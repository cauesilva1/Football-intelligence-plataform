/**
 * Season defensive totals via API-Football /players (FBref-equivalent lag).
 *
 *   npm run data:enrich-season-defense -- --teams=8
 *   npm run data:enrich-season-defense -- --teams=5 --season=2025
 */
import { enrichSeasonDefenseFromApiFootball } from "@/lib/api/enrich-season-defense";

function argValue(flag: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`${flag}=`));
  if (hit) return hit.slice(flag.length + 1);
  const idx = process.argv.indexOf(flag);
  if (idx >= 0 && process.argv[idx + 1] && !process.argv[idx + 1].startsWith("--")) {
    return process.argv[idx + 1];
  }
  return undefined;
}

async function main() {
  const teams = Number(argValue("--teams") ?? "8");
  const season = argValue("--season") ? Number(argValue("--season")) : undefined;
  console.log(`[enrich-season-defense] teams=${teams}` + (season ? ` season=${season}` : ""));
  const result = await enrichSeasonDefenseFromApiFootball({
    teamLimit: Number.isFinite(teams) ? teams : 8,
    season,
  });
  console.log("[enrich-season-defense] done", result);
}

main().catch((error) => {
  console.error("[enrich-season-defense] fatal", error);
  process.exit(1);
});
