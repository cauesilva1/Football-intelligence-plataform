/**
 * Prior-season soccer production via API-Football (real lines, not vanity denominators).
 *
 * Free tier: season ≤ 2024. Use that to unlock trajectory when current year already
 * exists from ESPN boxscores.
 *
 *   npm run data:backfill-soccer-seasons -- --teams=25
 *   npm run data:backfill-soccer-seasons -- --teams=40 --season=2024
 *   npm run data:backfill-soccer-seasons -- --teams=20 --all-teams
 */
import fs from "fs";
import path from "path";
import { enrichSoccerSeasonStatsFromApiFootball } from "@/lib/api/enrich-soccer-season-stats";

function loadDotEnv(): void {
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadDotEnv();

function argValue(flag: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`${flag}=`));
  if (hit) return hit.slice(flag.length + 1);
  const idx = process.argv.indexOf(flag);
  if (idx >= 0 && process.argv[idx + 1] && !process.argv[idx + 1].startsWith("--")) {
    return process.argv[idx + 1];
  }
  return undefined;
}

async function main(): Promise<void> {
  const teams = Number(argValue("--teams") ?? "25");
  const season = argValue("--season") ? Number(argValue("--season")) : 2024;
  const showcaseOnly = !process.argv.includes("--all-teams");

  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error("DATABASE_URL ausente.");
  }

  console.log(
    `[backfill-soccer-seasons] teams=${teams} · season=${season}` +
      (showcaseOnly ? " · showcase" : " · all-teams")
  );

  const result = await enrichSoccerSeasonStatsFromApiFootball({
    teamLimit: Number.isFinite(teams) ? teams : 25,
    season: Number.isFinite(season) ? season : 2024,
    showcaseOnly,
    skipDone: !process.argv.includes("--refresh"),
  });

  console.log("[backfill-soccer-seasons] done", result);
}

main().catch((error) => {
  console.error("[backfill-soccer-seasons] fatal", error);
  process.exit(1);
});
