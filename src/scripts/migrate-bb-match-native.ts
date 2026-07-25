/**
 * Copy legacy PlayerMatchStat hijack columns → native basketball fields.
 *
 *   npm run data:migrate-bb-match-native
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
      points: null,
      OR: [
        { source: { startsWith: "espn-nba" } },
        { source: { startsWith: "espn-mens" } },
        { source: { startsWith: "euroleague" } },
      ],
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
    await prisma.playerMatchStat.update({
      where: { id: row.id },
      data: {
        points: row.goals,
        rebounds: row.passesCompleted,
        steals: Math.round(row.tackles),
        blocks: Math.round(row.interceptions),
        fieldGoalsAttempted: row.passesAttempted,
      },
    });
    updated += 1;
  }

  console.log(`[migrate-bb-match-native] updated ${updated} rows`);
}

main().catch((error) => {
  console.error("[migrate-bb-match-native] fatal", error);
  process.exit(1);
});
