/**
 * One-shot: NBA box scores ingested after 1 July were stored on the new campaign
 * even when the game was played in the previous season. Re-label by tip-off and
 * rebuild 2026/27 totals from games that belong there.
 *
 *   npx tsx src/scripts/repair-nba-season-attribution.ts
 */
import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { repairMisfiledNbaSeasonTotals } from "@/lib/basketball/repair-nba-season";

function loadDotEnv(): void {
  for (const file of [".env", ".env.local"]) {
    const envPath = path.join(process.cwd(), file);
    if (!fs.existsSync(envPath)) continue;
    for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      if (process.env[key]) continue;
      process.env[key] = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    }
  }
}

async function main(): Promise<void> {
  loadDotEnv();
  const prisma = new PrismaClient();
  try {
    const result = await repairMisfiledNbaSeasonTotals(prisma);
    console.log(
      `[repair-nba-season] relabeled ${result.relabeled} appearances · rebuilt ${result.playersRebuilt} 2026/27 lines`
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("[repair-nba-season]", error);
  process.exit(1);
});
