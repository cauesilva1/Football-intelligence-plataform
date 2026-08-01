/**
 * Bootstrap EuroLeague clubs/rosters and backfill boxscores.
 *
 *   npm run data:sync-euroleague
 *   npm run data:sync-euroleague -- --days=90
 *   npm run data:sync-euroleague -- --all-played --limit=80
 *   npm run data:sync-euroleague -- --all-played
 *   npm run data:sync-euroleague -- --days=7 --force
 *   npm run data:sync-euroleague -- --skip-boxscores
 */
import fs from "fs";
import path from "path";
import { runEuroLeagueSync } from "@/lib/sync/euroleague-sync";

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

function readFlag(args: string[], name: string): string | undefined {
  const prefix = `--${name}=`;
  const hit = args.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : undefined;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2).filter((arg) => arg !== "--");
  const allPlayed = args.includes("--all-played");
  const days = Number(readFlag(args, "days") ?? (allPlayed ? "365" : "14"));
  const force = args.includes("--force");
  const skipBoxscores = args.includes("--skip-boxscores");
  const limitRaw = readFlag(args, "limit");
  const limit = limitRaw ? Number(limitRaw) : undefined;

  if (!allPlayed && (!Number.isFinite(days) || days < 1 || days > 400)) {
    throw new Error("Use --days=N com N entre 1 e 400, ou --all-played.");
  }
  if (limit != null && (!Number.isFinite(limit) || limit < 1)) {
    throw new Error("Use --limit=N com N >= 1.");
  }

  console.log(
    `[sync-euroleague] ${allPlayed ? "all-played" : `days=${days}`}` +
      `${limit != null ? ` · limit=${limit}` : ""}` +
      `${force ? " · force" : ""}` +
      `${skipBoxscores ? " · skip-boxscores" : ""}…`
  );

  const result = await runEuroLeagueSync({
    days,
    force,
    skipBoxscores,
    allPlayed,
    limit,
  });
  console.log(
    `[sync-euroleague] OK — clubs ${result.clubs} · players ${result.players} · boxscore stats ${result.boxscores.statsUpdated}`
  );
}

main().catch((error) => {
  console.error("[sync-euroleague] ERRO:", error);
  process.exit(1);
});
