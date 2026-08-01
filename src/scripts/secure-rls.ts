/**
 * Enable RLS lockdown on all public OmniScout tables (Supabase alert fix).
 *
 *   npm run db:secure-rls
 *
 * Uses DIRECT_URL (session) when set, else DATABASE_URL.
 * App access is via Prisma (postgres role) — not PostgREST anon.
 */
import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

const TABLES = [
  "users",
  "competitions",
  "teams",
  "players",
  "matches",
  "player_statistics",
  "player_season_stats",
  "player_match_stats",
  "team_statistics",
  "scouting_reports",
  "workspace_shortlist_entries",
  "recruitment_brief_runs",
  "system_cache",
] as const;

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
  const url = process.env.DIRECT_URL?.trim() || process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error("DIRECT_URL or DATABASE_URL required.");
  }

  const prisma = new PrismaClient({
    datasources: { db: { url } },
    log: ["error"],
  });

  console.log("[db:secure-rls] Enabling RLS + deny policies for anon/authenticated…");

  try {
    for (const table of TABLES) {
      const exists = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(
        `SELECT to_regclass('public.${table}') IS NOT NULL AS exists`
      );
      if (!exists[0]?.exists) {
        console.log(`[db:secure-rls] skip missing table: ${table}`);
        continue;
      }

      await prisma.$executeRawUnsafe(
        `ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY`
      );

      await prisma.$executeRawUnsafe(
        `DROP POLICY IF EXISTS deny_all_anon ON public.${table}`
      );
      await prisma.$executeRawUnsafe(
        `DROP POLICY IF EXISTS deny_all_authenticated ON public.${table}`
      );

      await prisma.$executeRawUnsafe(
        `CREATE POLICY deny_all_anon ON public.${table} AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false)`
      );
      await prisma.$executeRawUnsafe(
        `CREATE POLICY deny_all_authenticated ON public.${table} AS RESTRICTIVE FOR ALL TO authenticated USING (false) WITH CHECK (false)`
      );

      console.log(`[db:secure-rls] secured: ${table}`);
    }

    console.log("[db:secure-rls] OK.");
    console.log(
      "[db:secure-rls] Re-check Supabase → Database → Security Advisor. Prisma (DATABASE_URL) keeps working."
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("[db:secure-rls] fatal", error);
  process.exit(1);
});
