/**
 * Incremental NWSL teams + rosters from ESPN (no API-Football quota).
 * Stops when the time budget elapses and resumes on the next run.
 *
 *   npm run data:sync-nwsl
 *   npm run data:sync-nwsl -- --budget-ms=120000
 */
import fs from "fs";
import path from "path";
import { NWSL_SYNC_BUDGET_MS } from "@/lib/sync/nwsl-plan";
import { runNwslBackfill } from "@/lib/sync/nwsl-sync";

function loadDotEnv(): void {
  for (const file of [".env", ".env.local"]) {
    const envPath = path.join(process.cwd(), file);
    if (!fs.existsSync(envPath)) continue;
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
      if (process.env[key] === undefined) process.env[key] = value;
    }
  }
}

function budgetMs(): number {
  const arg = process.argv.find((value) => value.startsWith("--budget-ms="));
  const parsed = arg ? Number(arg.slice("--budget-ms=".length)) : NWSL_SYNC_BUDGET_MS;
  if (!Number.isFinite(parsed) || parsed < 5_000) return NWSL_SYNC_BUDGET_MS;
  return Math.min(parsed, 120_000);
}

async function main(): Promise<void> {
  loadDotEnv();
  const startedAt = Date.now();
  const result = await runNwslBackfill({ deadlineAt: startedAt + budgetMs() });
  console.log(`[sync-nwsl] ${JSON.stringify(result)}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
