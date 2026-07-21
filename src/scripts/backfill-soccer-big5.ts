/**
 * Backfill Big-5 (+ UCL) ESPN boxscores → PlayerMatchStat (Recent appearances).
 *
 * Uso:
 *   npm run data:backfill-big5
 *   npm run data:backfill-big5 -- --days=40 --end=2026-05-25
 */
import fs from "fs";
import path from "path";
import { runSoccerBoxscoreBackfill } from "@/lib/cron/soccer-daily-sync";
import { getPrisma } from "@/lib/prisma";

const BIG5_SLUGS = ["esp.1", "eng.1", "ita.1", "fra.1", "ger.1", "uefa.champions"] as const;

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

function readFlag(args: string[], name: string): string | undefined {
  const prefix = `--${name}=`;
  const hit = args.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : undefined;
}

function parseEndDate(raw: string | undefined): Date {
  if (!raw) {
    // Late European season window (2025/26 typically ends mid/late May).
    return new Date(Date.UTC(2026, 4, 25, 12, 0, 0));
  }
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw.trim());
  if (!m) throw new Error("Use --end=YYYY-MM-DD");
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0));
}

async function main(): Promise<void> {
  const args = process.argv.slice(2).filter((arg) => arg !== "--");
  const days = Number(readFlag(args, "days") ?? "35");
  const endDate = parseEndDate(readFlag(args, "end"));
  const force = args.includes("--force");

  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error("DATABASE_URL ausente.");
  }
  if (!Number.isFinite(days) || days < 1) {
    throw new Error("Use --days=N (1–90).");
  }

  console.log(
    `[backfill-big5] leagues=${BIG5_SLUGS.join(",")} · days=${days} · end=${endDate
      .toISOString()
      .slice(0, 10)}${force ? " · FORCE" : ""}`
  );

  let processed = 0;
  let skipped = 0;
  let failed = 0;

  for (const slug of BIG5_SLUGS) {
    console.log(`\n[backfill-big5] —— ${slug} ——`);
    try {
      const result = await runSoccerBoxscoreBackfill({
        days,
        espnSlug: slug,
        endDate,
        force,
      });
      processed += result.processed;
      skipped += result.skipped;
      failed += result.failed;
      console.log(
        `[backfill-big5] ${slug} done — processed ${result.processed} · skipped ${result.skipped} · failed ${result.failed}`
      );
    } catch (error) {
      failed += 1;
      console.error(`[backfill-big5] ${slug} FATAL:`, error);
    }
  }

  console.log(
    `\n[backfill-big5] ALL DONE — processed ${processed} · skipped ${skipped} · failed ${failed}`
  );
}

main()
  .catch((error: unknown) => {
    console.error("[backfill-big5] Erro fatal:", error);
    process.exit(1);
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });
