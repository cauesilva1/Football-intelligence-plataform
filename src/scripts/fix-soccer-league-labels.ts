/**
 * Realign soccer `player.league` when it still says legacy "Série A"
 * but the club belongs to another competition (Big5 / MLS / etc.).
 *
 *   npm run data:fix-soccer-leagues
 *   npm run data:fix-soccer-leagues -- --dry-run
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

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error("DATABASE_URL ausente.");
  }

  const prisma = getPrisma();
  const rows = await prisma.player.findMany({
    where: { sport: "SOCCER", teamId: { not: null } },
    select: {
      id: true,
      fullName: true,
      league: true,
      team: { select: { name: true, competition: { select: { name: true } } } },
    },
  });

  let fixed = 0;
  const samples: Array<{ player: string; from: string; to: string; club: string }> = [];

  for (const row of rows) {
    const comp = row.team?.competition?.name;
    if (!comp || row.league === comp) continue;

    const legacySerie = /s[eé]rie a/i.test(row.league || "");
    const brazilClub = /brasileir/i.test(comp);
    if (!legacySerie || brazilClub) continue;

    if (!dryRun) {
      await prisma.player.update({
        where: { id: row.id },
        data: { league: comp },
      });
    }
    fixed += 1;
    if (samples.length < 12) {
      samples.push({
        player: row.fullName,
        from: row.league,
        to: comp,
        club: row.team?.name ?? "?",
      });
    }
  }

  console.log(
    JSON.stringify(
      { dryRun, checked: rows.length, fixed, samples },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error("[fix-soccer-leagues] fatal", error);
  process.exit(1);
});
