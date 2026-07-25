/**
 * Copy legacy PlayerMatchStat hijack columns → native AF fields.
 *
 *   npm run data:migrate-af-match-native
 */
import fs from "fs";
import path from "path";
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

loadDotEnv();

async function main() {
  const prisma = getPrisma();
  const rows = await prisma.playerMatchStat.findMany({
    where: {
      totalYards: null,
      OR: [{ source: { startsWith: "espn-nfl" } }, { source: { startsWith: "espn-cfb" } }],
    },
    select: {
      id: true,
      goals: true,
      assists: true,
      tackles: true,
      interceptions: true,
      passesCompleted: true,
      passesAttempted: true,
    },
  });

  let updated = 0;
  for (const row of rows) {
    const touchdowns = row.goals;
    const rushingYards = row.passesCompleted;
    const passingYards = row.passesAttempted;
    const receivingYards = 0;
    await prisma.playerMatchStat.update({
      where: { id: row.id },
      data: {
        touchdowns,
        rushingYards,
        passingYards,
        receivingYards,
        totalYards: passingYards + rushingYards + receivingYards,
        // tackles/interceptions already native-ish on shared columns
      },
    });
    updated += 1;
  }

  // Season rows: copy hijack → native when native null
  const seasonRows = await prisma.playerSeasonStats.findMany({
    where: {
      totalYards: null,
      player: { sport: "AMERICAN_FOOTBALL" },
    },
    select: {
      id: true,
      goals: true,
      points: true,
      rebounds: true,
      blocks: true,
      steals: true,
      threePointsPercent: true,
    },
  });

  let seasonUpdated = 0;
  for (const row of seasonRows) {
    const passingYards = Math.round(row.threePointsPercent || 0);
    const rushingYards = row.rebounds;
    const receivingYards = row.blocks;
    await prisma.playerSeasonStats.update({
      where: { id: row.id },
      data: {
        touchdowns: row.goals,
        passingYards,
        rushingYards,
        receivingYards,
        totalYards: row.points || passingYards + rushingYards + receivingYards,
        sacks: row.steals / 10,
      },
    });
    seasonUpdated += 1;
  }

  console.log(
    `[migrate-af-match-native] match rows ${updated} · season rows ${seasonUpdated}`
  );
}

main().catch((error) => {
  console.error("[migrate-af-match-native] fatal", error);
  process.exit(1);
});
