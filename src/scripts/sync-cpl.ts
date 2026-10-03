/**
 * Incremental Canadian Premier League teams + players (API-Football).
 * Stops when the daily quota is near its floor or the time budget elapses.
 *
 *   npm run data:sync-cpl
 *   npm run data:sync-cpl -- --budget-ms=120000
 */
import fs from "fs";
import path from "path";
import { startFootballQuotaRun } from "@/lib/api-sports";
import { formatQuotaLog } from "@/lib/api-quota";
import { CPL_SYNC_BUDGET_MS } from "@/lib/sync/cpl-plan";
import { runCplBackfill } from "@/lib/sync/cpl-sync";

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
  const parsed = arg ? Number(arg.slice("--budget-ms=".length)) : CPL_SYNC_BUDGET_MS;
  if (!Number.isFinite(parsed) || parsed < 5_000) return CPL_SYNC_BUDGET_MS;
  return Math.min(parsed, 120_000);
}

async function main(): Promise<void> {
  loadDotEnv();
  const startedAt = Date.now();
  const quota = await startFootballQuotaRun();
  console.log(`[sync-cpl] ${formatQuotaLog(quota.snapshot())}`);

  if (!process.env.APISPORTS_KEY?.trim()) {
    quota.recordSkip("APISPORTS_KEY not set");
    console.warn("[sync-cpl] APISPORTS_KEY missing — nothing fetched.");
    return;
  }

  if (!quota.canSpend(1)) {
    quota.recordSkip("CPL backfill: fewer than the minimum calls remain");
    console.warn("[sync-cpl] quota low — resume on the next run.");
    console.log(`[sync-cpl] ${formatQuotaLog(quota.snapshot())}`);
    return;
  }

  const result = await runCplBackfill({
    deadlineAt: startedAt + budgetMs(),
    quota,
  });
  console.log(`[sync-cpl] ${JSON.stringify(result)}`);
  console.log(`[sync-cpl] ${formatQuotaLog(quota.snapshot())}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
