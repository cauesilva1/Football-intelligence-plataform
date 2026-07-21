/**
 * Fill Competition.espnSlug from SOCCER_COMPETITIONS when rows were created without it.
 * Run: npx tsx src/scripts/patch-soccer-competition-slugs.ts
 */
import fs from "fs";
import path from "path";
import { SOCCER_COMPETITIONS } from "@/lib/tournaments/soccer-competitions";
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
  const prisma = getPrisma();
  let updated = 0;

  for (const cfg of SOCCER_COMPETITIONS) {
    if (!cfg.espnSlug) continue;
    const rows = await prisma.competition.findMany({
      where: {
        OR: [
          { name: { equals: cfg.name, mode: "insensitive" } },
          { name: { equals: cfg.espnCompetitionLabel ?? cfg.name, mode: "insensitive" } },
          { espnSlug: cfg.espnSlug },
        ],
      },
    });

    for (const row of rows) {
      if (row.espnSlug === cfg.espnSlug) continue;
      await prisma.competition.update({
        where: { id: row.id },
        data: { espnSlug: cfg.espnSlug },
      });
      updated += 1;
      console.log(`[patch-slugs] ${row.name}: ${row.espnSlug ?? "null"} → ${cfg.espnSlug}`);
    }
  }

  console.log(`[patch-slugs] Done — updated ${updated}`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });
