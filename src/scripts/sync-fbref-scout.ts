/**
 * Season scout totals from the configured provider (FBref unless overridden).
 *
 *   npm run data:sync-fbref-scout
 *   npm run data:sync-fbref-scout -- --league=usa.1
 */
import fs from "fs";
import path from "path";
import { FBREF_SCOUT_LEAGUES } from "@/lib/providers/fbref/scout-leagues";
import { getPrisma } from "@/lib/prisma";
import { syncScoutMetrics } from "@/lib/soccer/scout-metrics-sync";

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

async function main() {
  const requested = process.argv.find((arg) => arg.startsWith("--league="))?.slice("--league=".length);
  const leagueKeys = requested
    ? [requested]
    : FBREF_SCOUT_LEAGUES.map((league) => league.leagueKey);
  const results = await syncScoutMetrics(undefined, leagueKeys);
  console.log(`[fbref-scout] ${JSON.stringify(results)}`);
}

main()
  .catch((error: unknown) => {
    console.error("[fbref-scout] fatal", error);
    process.exit(1);
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });
