/**
 * Reset temporada NBA 202627 e migra posições PT → PG/SG/SF/PF/C.
 *
 * Uso: npx tsx src/scripts/reset-basketball-season.ts
 */
import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { LEGACY_BASKETBALL_POSITION_MAP } from "@/lib/positions";

const SEASON_CURRENT = 202627;

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

async function main(): Promise<void> {
  const prisma = new PrismaClient();

  const reset = await prisma.playerSeasonStats.updateMany({
    where: { season: SEASON_CURRENT },
    data: {
      goals: 0,
      assists: 0,
      tackles: 0,
      interceptions: 0,
      passingAccuracy: 0,
      minutesPlayed: 0,
      matchesPlayed: 0,
      points: 0,
      rebounds: 0,
      steals: 0,
      blocks: 0,
      fieldGoalsPercent: 0,
      threePointsPercent: 0,
    },
  });

  const cache = await prisma.systemCache.deleteMany({
    where: { key: { contains: "espn:basketball:nba:boxscore:202627" } },
  });

  let positionsUpdated = 0;
  for (const [legacy, modern] of Object.entries(LEGACY_BASKETBALL_POSITION_MAP)) {
    const result = await prisma.player.updateMany({
      where: { sport: "BASKETBALL", position: legacy },
      data: { position: modern },
    });
    positionsUpdated += result.count;
  }

  let secondaryUpdated = 0;
  for (const [legacy, modern] of Object.entries(LEGACY_BASKETBALL_POSITION_MAP)) {
    const result = await prisma.player.updateMany({
      where: { sport: "BASKETBALL", secondaryPosition: legacy },
      data: { secondaryPosition: modern },
    });
    secondaryUpdated += result.count;
  }

  console.log(
    `[reset-basketball] Temporada ${SEASON_CURRENT}: ${reset.count} linhas zeradas · cache removido: ${cache.count} · posições migradas: ${positionsUpdated} · secundárias: ${secondaryUpdated}`
  );

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error("[reset-basketball] ERRO:", error);
  process.exit(1);
});
