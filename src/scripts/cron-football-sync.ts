/**
 * Uso: npm run data:cron-af
 *      npm run data:cron-af -- --force
 */
import fs from "fs";
import path from "path";
import { runFootballDailySync } from "@/lib/cron/football-daily-sync";

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

const force = process.argv.includes("--force");

runFootballDailySync({ force })
  .then((result) => {
    console.log(
      `[cron-af] OK — processed ${result.totals.processed} · skipped ${result.totals.skipped} · stats ${result.totals.statsUpdated}`
    );
  })
  .catch((error) => {
    console.error("[cron-af] ERRO:", error);
    process.exit(1);
  });
