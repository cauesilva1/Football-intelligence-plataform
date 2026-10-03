/**
 * Diagnóstico somente leitura: onde o cron de futebol parou de gravar boxscores.
 *
 * Uso: npx tsx src/scripts/diagnose-soccer-boxscore-stall.ts [--since=2026-08-10]
 * Não escreve no banco; não imprime credenciais.
 */

if (process.env.DIRECT_URL?.trim()) {
  process.env.DATABASE_URL = process.env.DIRECT_URL.trim();
}

import fs from "fs";
import path from "path";

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

function parseSince(argv: string[]): Date {
  const arg = argv.find((a) => a.startsWith("--since="));
  const raw = arg ? arg.slice("--since=".length) : "2026-08-10";
  const d = new Date(`${raw}T00:00:00Z`);
  return Number.isFinite(d.getTime()) ? d : new Date("2026-08-10T00:00:00Z");
}

function day(d: Date | null | undefined): string {
  return d ? d.toISOString().slice(0, 10) : "-";
}

async function main() {
  const { getPrisma } = await import("../lib/prisma");
  const prisma = getPrisma();
  const since = parseSince(process.argv.slice(2));

  console.log(`[diag] since=${day(since)}`);

  const lastStat = await prisma.playerMatchStat.findFirst({
    orderBy: { createdAt: "desc" },
    select: { createdAt: true, matchDate: true, competitionLabel: true },
  });
  console.log(
    `[diag] lastPlayerMatchStat createdAt=${day(lastStat?.createdAt)} matchDate=${day(lastStat?.matchDate)} comp=${lastStat?.competitionLabel ?? "-"}`
  );

  const statsByMonth = await prisma.$queryRaw<
    Array<{ ym: string; n: bigint; matches: bigint }>
  >`SELECT to_char("matchDate",'YYYY-MM-DD') AS ym, count(*) AS n, count(DISTINCT "externalEventKey") AS matches
    FROM player_match_stats WHERE "passesAttempted" >= 0 AND points IS NULL AND "passingYards" IS NULL AND "matchDate" >= ${since} GROUP BY 1 ORDER BY 1`;
  console.log("[diag] PlayerMatchStat por matchDate (linhas / jogos):");
  for (const row of statsByMonth) {
    console.log(`  ${row.ym} rows=${row.n} matches=${row.matches}`);
  }

  const cacheRows = await prisma.systemCache.findMany({
    where: { key: { startsWith: "espn:" }, AND: { key: { contains: ":boxscore:" } } },
    orderBy: { updatedAt: "desc" },
    take: 60,
    select: { key: true, updatedAt: true, json: true },
  });
  console.log(`[diag] systemCache boxscore — 60 mais recentes (de ${cacheRows.length}):`);
  for (const row of cacheRows.slice(0, 25)) {
    const j = row.json as { playersProcessed?: number; statsUpserted?: number } | null;
    console.log(
      `  ${row.updatedAt.toISOString()} ${row.key} players=${j?.playersProcessed ?? "?"} upserted=${j?.statsUpserted ?? "?"}`
    );
  }
  const zero = cacheRows.filter((r) => {
    const j = r.json as { statsUpserted?: number } | null;
    return (j?.statsUpserted ?? 0) === 0;
  });
  console.log(`[diag] entre os 60 mais recentes, com statsUpserted=0: ${zero.length}`);

  const matchesByComp = await prisma.$queryRaw<
    Array<{
      comp: string | null;
      finished: bigint;
      with_stats: bigint;
      last_finished: Date | null;
      last_updated: Date | null;
    }>
  >`SELECT c.name AS comp,
           count(*) FILTER (WHERE m.status='finished') AS finished,
           count(*) FILTER (WHERE m.status='finished' AND EXISTS (
             SELECT 1 FROM player_match_stats s WHERE s."externalEventKey" = m."externalKey")) AS with_stats,
           max(m."matchDate") FILTER (WHERE m.status='finished') AS last_finished,
           max(m."updatedAt") AS last_updated
    FROM matches m LEFT JOIN competitions c ON c.id = m."competitionId"
    WHERE m."matchDate" >= ${since} AND m."matchDate" < now() AND m.source='espn'
    GROUP BY 1 ORDER BY 2 DESC`;
  console.log("[diag] Match (espn) desde 'since': finalizados / com PlayerMatchStat:");
  for (const row of matchesByComp) {
    console.log(
      `  ${row.comp ?? "(sem competição)"} finished=${row.finished} withStats=${row.with_stats} lastFinished=${day(row.last_finished)} lastUpdated=${row.last_updated?.toISOString() ?? "-"}`
    );
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error("[diag] erro:", error instanceof Error ? error.message : error);
  process.exit(1);
});
