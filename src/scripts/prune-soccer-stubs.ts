/**
 * Remove API/ESPN invent stubs that never reached a productive season.
 * Markers: nationality Unknown + DOB 2000-01-01 (from enrich create-missing).
 *
 * Default keeps rows that have matchStats (active ESPN ingest may still fill them).
 * Use --force-match-stats to drop invent zeros even with match rows (post-backfill).
 *
 *   npm run data:prune-soccer-stubs -- --dry-run
 *   npm run data:prune-soccer-stubs
 *   npm run data:prune-soccer-stubs -- --force-match-stats
 */
import fs from "fs";
import path from "path";
import { getPrisma } from "@/lib/prisma";
import { isProductiveSeasonRow } from "@/lib/intelligence/data-depth";

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

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  const forceMatchStats = process.argv.includes("--force-match-stats");
  if (!process.env.DATABASE_URL?.trim()) throw new Error("DATABASE_URL ausente.");

  const prisma = getPrisma();
  const stubDob = new Date("2000-01-01T00:00:00.000Z");

  const candidates = await prisma.player.findMany({
    where: {
      sport: "SOCCER",
      nationality: "Unknown",
      dateOfBirth: stubDob,
    },
    select: {
      id: true,
      fullName: true,
      league: true,
      stats: { select: { matchesPlayed: true, minutesPlayed: true } },
      statistics: { select: { appearances: true, minutesPlayed: true } },
      _count: { select: { matchStats: true, reports: true, shortlistEntries: true } },
    },
  });

  const toDelete: string[] = [];
  let skippedMatchStats = 0;
  for (const player of candidates) {
    if (player._count.reports > 0 || player._count.shortlistEntries > 0) {
      continue;
    }
    if (!forceMatchStats && player._count.matchStats > 0) {
      skippedMatchStats += 1;
      continue;
    }
    let productive = 0;
    for (const row of player.stats) {
      if (isProductiveSeasonRow(row.matchesPlayed, row.minutesPlayed, "SOCCER")) {
        productive += 1;
      }
    }
    for (const row of player.statistics) {
      if (isProductiveSeasonRow(row.appearances, row.minutesPlayed, "SOCCER")) {
        productive += 1;
      }
    }
    if (productive === 0) toDelete.push(player.id);
  }

  console.log(
    JSON.stringify(
      {
        dryRun,
        forceMatchStats,
        candidates: candidates.length,
        skippedMatchStats,
        deletable: toDelete.length,
        samples: candidates
          .filter((p) => toDelete.includes(p.id))
          .slice(0, 8)
          .map((p) => ({ name: p.fullName, league: p.league })),
      },
      null,
      2
    )
  );

  if (!dryRun && toDelete.length) {
    const result = await prisma.player.deleteMany({ where: { id: { in: toDelete } } });
    console.log(`[prune-soccer-stubs] deleted ${result.count}`);
  }
}

main().catch((error) => {
  console.error("[prune-soccer-stubs] fatal", error);
  process.exit(1);
});
