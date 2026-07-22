/**
 * Multi-day ESPN NBA boxscore backfill → season averages + PlayerMatchStat.
 *
 *   npm run data:backfill-boxscores-basquete -- --days=14
 *   npm run data:backfill-boxscores-basquete -- --days=21 --end=2026-07-20
 *   npm run data:backfill-boxscores-basquete -- --days=7 --force
 */
import fs from "fs";
import path from "path";
import { runBasketballBoxscoreBackfill } from "@/lib/cron/basketball-daily-sync";

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

function readFlag(args: string[], name: string): string | undefined {
  const prefix = `--${name}=`;
  const hit = args.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : undefined;
}

function parseEndDate(raw: string | undefined): Date | undefined {
  if (!raw) return undefined;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw.trim());
  if (!m) {
    throw new Error("Use --end=YYYY-MM-DD (local calendar day).");
  }
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2).filter((arg) => arg !== "--");
  const days = Number(readFlag(args, "days") ?? "14");
  const endDate = parseEndDate(readFlag(args, "end"));
  const force = args.includes("--force");

  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error("DATABASE_URL ausente. Configure .env antes de executar o backfill.");
  }

  if (!Number.isFinite(days) || days < 1 || days > 90) {
    throw new Error("Use --days=N com N entre 1 e 90.");
  }

  console.log(
    `[backfill-boxscores-basquete] days=${days}${
      endDate ? ` · end=${endDate.toISOString().slice(0, 10)}` : ""
    }${force ? " · force" : ""}...`
  );

  const result = await runBasketballBoxscoreBackfill({ days, force, endDate });

  console.log(
    `[backfill-boxscores-basquete] OK — processed ${result.totals.processed} · skipped ${result.totals.skipped} · failed ${result.totals.failed} · statsUpdated ${result.totals.statsUpdated}`
  );
}

main().catch((error) => {
  console.error("[backfill-boxscores-basquete] ERRO:", error);
  process.exit(1);
});
