/**
 * Cron engine — last 2 days of ESPN finals across all soccer leagues
 * (same window as /api/cron/soccer).
 *
 * Uso: npm run data:cron-sync-2026
 */
import fs from "fs";
import path from "path";
import { runSoccerBoxscoreBackfill } from "@/lib/cron/soccer-daily-sync";
import { getPrisma } from "@/lib/prisma";

function loadDotEnv(): void {
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;

  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
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

runSoccerBoxscoreBackfill({ days: 2 })
  .then((result) => {
    console.log(
      `[cron-sync-2026] OK — days=${result.days} · processed=${result.processed} · skipped=${result.skipped} · failed=${result.failed}`
    );
  })
  .catch((error: unknown) => {
    console.error("[cron-sync-2026] Erro fatal:", error);
    process.exit(1);
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });
