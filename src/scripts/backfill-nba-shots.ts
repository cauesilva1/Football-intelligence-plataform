/**
 * Incremental NBA shot-chart backfill for games already stored.
 *
 *   npm run data:backfill-nba-shots
 *   npm run data:backfill-nba-shots -- --limit=10 --budget-ms=120000 --season=202627
 */
import fs from "fs";
import path from "path";
import { backfillNbaShotCharts } from "@/lib/basketball/nba-shot-sync";
import { resolveNbaBoxscoreSeason } from "@/lib/basketball/season";
import { getPrisma } from "@/lib/prisma";

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

function readFlag(name: string): number | null {
  const prefix = `--${name}=`;
  const raw = process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

loadDotEnv();

async function main() {
  const season = readFlag("season") ?? resolveNbaBoxscoreSeason();
  const limit = readFlag("limit") ?? undefined;
  const budgetMs = readFlag("budget-ms") ?? 120_000;
  const result = await backfillNbaShotCharts({
    season,
    deadlineMs: Date.now() + budgetMs,
    ...(limit != null ? { maxGames: limit } : {}),
    log: (message) => console.log(`[nba-shots] ${message}`),
  });
  console.log(`[nba-shots] ${JSON.stringify(result)}`);
}

main()
  .catch((error: unknown) => {
    console.error("[nba-shots] fatal", error);
    process.exit(1);
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });
