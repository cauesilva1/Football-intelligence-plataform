/**
 * Prior-season soccer production via API-Football (real lines, not vanity denominators).
 *
 * Free tier: season ≤ 2024. Use that to unlock trajectory when current year already
 * exists from ESPN boxscores.
 *
 *   npm run data:backfill-soccer-seasons -- --teams=25
 *   npm run data:backfill-soccer-seasons -- --teams=40 --season=2024
 *   npm run data:backfill-soccer-seasons -- --low-quota
 *     → 12 clubs · 1 page · big5-only · prefer-zeros · refresh (~12 calls)
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
  const lowQuota = process.argv.includes("--low-quota");
  const teams = Number(argValue("--teams") ?? (lowQuota ? "12" : "25"));
  const season = argValue("--season") ? Number(argValue("--season")) : 2024;
  const maxPages = Number(argValue("--max-pages") ?? (lowQuota ? "1" : "3"));
  const showcaseOnly = !process.argv.includes("--all-teams");
  const refresh = lowQuota || process.argv.includes("--refresh");
  const big5Only = lowQuota || process.argv.includes("--big5-only");
  const preferZeros = lowQuota || process.argv.includes("--prefer-zeros");

  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error("DATABASE_URL ausente.");
  }

  console.log(
    `[backfill-soccer-seasons] teams=${teams} · season=${season} · maxPages=${maxPages}` +
      (showcaseOnly ? " · showcase" : " · all-teams") +
      (big5Only ? " · big5-only" : "") +
      (preferZeros ? " · prefer-zeros" : "") +
      (refresh ? " · refresh" : "") +
      (lowQuota ? " · low-quota" : "")
  );

  const result = await enrichSoccerSeasonStatsFromApiFootball({
    teamLimit: Number.isFinite(teams) ? teams : 25,
    season: Number.isFinite(season) ? season : 2024,
    showcaseOnly,
    big5Only,
    skipDone: !refresh,
    createMissingPlayers: process.argv.includes("--create-missing"),
    preferZeros,
    maxPages: Number.isFinite(maxPages) ? maxPages : 3,
  });

  console.log("[backfill-soccer-seasons] done", result);
}

main().catch((error) => {
  console.error("[backfill-soccer-seasons] fatal", error);
  process.exit(1);
});
