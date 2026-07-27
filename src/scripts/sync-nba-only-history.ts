/**
 * Carga leve — histórico NBA multi-season (2023-24 … 2025-26) para jogadores já cadastrados.
 *
 * Uso:
 *   npm run data:sync-nba-teste -- --teams=30
 *   npm run data:sync-nba-teste -- --teams=30 --ones-only
 */
import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

const SEASON_TARGETS: Array<{
  key: number;
  labels: string[];
  years: number[];
}> = [
  { key: 202526, labels: ["2025-26", "2025"], years: [2026] },
  { key: 202425, labels: ["2024-25", "2024"], years: [2025] },
  { key: 202324, labels: ["2023-24", "2023"], years: [2024] },
];

const DEFAULT_TEAM_LIMIT = 3;
const FETCH_DELAY_MIN_MS = 50;
const FETCH_DELAY_MAX_MS = 75;

const NBA_STATS_FALLBACK_URL = (espnId: string, league = "nba") =>
  `https://site.api.espn.com/apis/common/v3/sports/basketball/nba/athletes/${espnId}/stats?league=${league}`;

const FETCH_HEADERS: HeadersInit = {
  "User-Agent": "football-intelligence-platform/1.0 (nba-history-test)",
  Accept: "application/json",
};

interface EspnSeasonRef {
  year?: number;
  displayName?: string;
}

interface EspnStatRow {
  season?: EspnSeasonRef;
  stats?: string[];
}

interface EspnStatsCategory {
  name?: string;
  names?: string[];
  statistics?: EspnStatRow[];
}

interface EspnV3StatsResponse {
  categories?: EspnStatsCategory[];
}

interface ParsedBasketballStats {
  matchesPlayed: number;
  minutesPlayed: number;
  points: number;
  rebounds: number;
  steals: number;
  blocks: number;
  assists: number;
  fieldGoalsPercent: number;
  threePointsPercent: number;
}

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

function parseTeamLimit(): number {
  const arg = process.argv.find((value) => value.startsWith("--teams="));
  if (!arg) return DEFAULT_TEAM_LIMIT;
  const parsed = Number.parseInt(arg.split("=")[1] ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TEAM_LIMIT;
}

function wantsOnesOnly(): boolean {
  return process.argv.includes("--ones-only");
}

function isProductiveNbaRow(stats: ParsedBasketballStats): boolean {
  return stats.matchesPlayed >= 8 && stats.minutesPlayed >= 150;
}

function seasonKeyFromEspn(season: EspnSeasonRef | undefined): number | null {
  for (const target of SEASON_TARGETS) {
    if (matchesSeasonTarget(season, target)) return target.key;
  }
  // Fallback: ESPN year N → season key (N-1)*100 + (N%100) e.g. 2024 → 202324
  if (typeof season?.year === "number" && season.year >= 2020 && season.year <= 2030) {
    const end = season.year % 100;
    const start = (season.year - 1) % 100;
    return (season.year - 1) * 100 + end;
  }
  return null;
}

function throttleDelayMs(): number {
  return (
    FETCH_DELAY_MIN_MS +
    Math.floor(Math.random() * (FETCH_DELAY_MAX_MS - FETCH_DELAY_MIN_MS + 1))
  );
}

async function throttle(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, throttleDelayMs()));
}

async function fetchJson<T>(url: string): Promise<T | null> {
  const response = await fetch(url, {
    headers: FETCH_HEADERS,
    signal: AbortSignal.timeout(45_000),
  });

  if (response.status === 404) return null;
  if (response.status >= 500) return null;
  if (!response.ok) throw new Error(`ESPN HTTP ${response.status} — ${url}`);
  return (await response.json()) as T;
}

function parseNumber(value?: string): number {
  if (!value?.trim()) return 0;
  const parsed = Number.parseFloat(value.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function seasonMatchesLabel(season: EspnSeasonRef | undefined, label: string): boolean {
  const display = season?.displayName?.trim() ?? "";
  return display === label || display.includes(label);
}

function matchesSeasonTarget(
  season: EspnSeasonRef | undefined,
  target: (typeof SEASON_TARGETS)[number]
): boolean {
  if (!season) return false;
  if (typeof season.year === "number" && target.years.includes(season.year)) return true;
  return target.labels.some((label) => seasonMatchesLabel(season, label));
}

function findSeasonRow(
  categories: EspnStatsCategory[] | null | undefined,
  matcher: (season: EspnSeasonRef | undefined) => boolean
): EspnStatRow | null {
  const averages = categories?.find((category) => category.name === "averages");
  if (!averages?.statistics?.length) return null;

  const rows = [...averages.statistics].reverse();
  return rows.find((row) => matcher(row.season)) ?? null;
}

function parseStatsRow(row: EspnStatRow, names: string[]): ParsedBasketballStats | null {
  const values = row.stats ?? [];
  if (!values.length) return null;

  const indexOf = (key: string): number => names.indexOf(key);
  const gamesPlayed = parseNumber(values[indexOf("gamesPlayed")]);
  const avgMinutes = parseNumber(values[indexOf("avgMinutes")]);
  const avgPoints = parseNumber(values[indexOf("avgPoints")]);

  if (gamesPlayed <= 0 && avgPoints <= 0) return null;

  return {
    matchesPlayed: Math.round(gamesPlayed),
    minutesPlayed: Math.round(avgMinutes * gamesPlayed),
    points: Math.round(parseNumber(values[indexOf("avgPoints")])),
    rebounds: Math.round(parseNumber(values[indexOf("avgRebounds")])),
    steals: Math.round(parseNumber(values[indexOf("avgSteals")])),
    blocks: Math.round(parseNumber(values[indexOf("avgBlocks")])),
    assists: Math.round(parseNumber(values[indexOf("avgAssists")])),
    fieldGoalsPercent: parseNumber(values[indexOf("fieldGoalPct")]),
    threePointsPercent: parseNumber(values[indexOf("threePointFieldGoalPct")]),
  };
}

async function fetchStatsCategories(
  espnId: string,
  league: "nba" | "mens-college-basketball"
): Promise<EspnStatsCategory[] | null> {
  await throttle();
  const payload = await fetchJson<EspnV3StatsResponse>(NBA_STATS_FALLBACK_URL(espnId, league));
  return payload?.categories ?? null;
}

/** Resolve as many completed seasons as ESPN exposes (NBA then NCAA fill). */
async function resolveHistoricalSeasons(
  espnId: string
): Promise<Array<{ seasonKey: number; stats: ParsedBasketballStats }>> {
  const resolved = new Map<number, ParsedBasketballStats>();

  const ingest = (categories: EspnStatsCategory[] | null) => {
    const averages = categories?.find((category) => category.name === "averages");
    if (!averages?.statistics?.length) return;
    const names = averages.names ?? [];
    for (const row of averages.statistics) {
      const key = seasonKeyFromEspn(row.season);
      if (key == null || resolved.has(key)) continue;
      const parsed = parseStatsRow(row, names);
      if (parsed) resolved.set(key, parsed);
    }
  };

  ingest(await fetchStatsCategories(espnId, "nba"));
  if ([...resolved.values()].filter(isProductiveNbaRow).length < 2) {
    ingest(await fetchStatsCategories(espnId, "mens-college-basketball"));
  }

  // Prefer known target keys first, then any other years found
  const orderedKeys = [
    ...SEASON_TARGETS.map((t) => t.key),
    ...[...resolved.keys()].filter((key) => !SEASON_TARGETS.some((t) => t.key === key)),
  ];
  const out: Array<{ seasonKey: number; stats: ParsedBasketballStats }> = [];
  for (const key of orderedKeys) {
    const stats = resolved.get(key);
    if (stats) out.push({ seasonKey: key, stats });
  }
  return out;
}

async function upsertSeasonStats(
  prisma: PrismaClient,
  playerId: string,
  season: number,
  stats: ParsedBasketballStats
): Promise<void> {
  await prisma.playerSeasonStats.upsert({
    where: {
      playerId_season: { playerId, season },
    },
    create: {
      playerId,
      season,
      goals: 0,
      assists: stats.assists,
      tackles: 0,
      interceptions: 0,
      passingAccuracy: 0,
      minutesPlayed: stats.minutesPlayed,
      matchesPlayed: stats.matchesPlayed,
      points: stats.points,
      rebounds: stats.rebounds,
      steals: stats.steals,
      blocks: stats.blocks,
      fieldGoalsPercent: stats.fieldGoalsPercent,
      threePointsPercent: stats.threePointsPercent,
    },
    update: {
      assists: stats.assists,
      minutesPlayed: stats.minutesPlayed,
      matchesPlayed: stats.matchesPlayed,
      points: stats.points,
      rebounds: stats.rebounds,
      steals: stats.steals,
      blocks: stats.blocks,
      fieldGoalsPercent: stats.fieldGoalsPercent,
      threePointsPercent: stats.threePointsPercent,
    },
  });
}

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error("DATABASE_URL ausente. Configure .env antes de executar.");
  }

  const teamLimit = parseTeamLimit();
  const onesOnly = wantsOnesOnly();
  const prisma = new PrismaClient();

  try {
    console.log(
      `[NBA-HIST-TEST] Histórico ${SEASON_TARGETS.map((t) => t.key).join(" + ")}` +
        ` — teams=${teamLimit}${onesOnly ? " · ones-only" : ""}`
    );

    const teams = await prisma.team.findMany({
      where: { competition: { name: "NBA" } },
      orderBy: { name: "asc" },
      take: teamLimit,
      select: { id: true, name: true },
    });

    if (!teams.length) {
      throw new Error("Nenhuma franquia NBA encontrada. Rode a carga de elencos primeiro.");
    }

    let processed = 0;
    let updated = 0;
    let multiSeason = 0;
    let skipped = 0;
    let failed = 0;
    let skippedNotOnes = 0;

    for (const team of teams) {
      console.log(`[NBA-HIST-TEST] Processando ${team.name}...`);

      const players = await prisma.player.findMany({
        where: {
          sport: "BASKETBALL",
          league: "NBA",
          teamId: team.id,
          apiSportsId: { not: null },
        },
        select: {
          id: true,
          fullName: true,
          apiSportsId: true,
          stats: { select: { matchesPlayed: true, minutesPlayed: true } },
        },
        orderBy: { fullName: "asc" },
      });

      let teamUpdated = 0;

      for (const player of players) {
        if (onesOnly) {
          const productive = player.stats.filter(
            (row) => row.matchesPlayed >= 8 && row.minutesPlayed >= 150
          ).length;
          if (productive !== 1) {
            skippedNotOnes += 1;
            continue;
          }
        }

        processed += 1;

        try {
          const espnId = String(player.apiSportsId);
          const seasons = await resolveHistoricalSeasons(espnId);

          if (!seasons.length) {
            skipped += 1;
            continue;
          }

          for (const row of seasons) {
            await upsertSeasonStats(prisma, player.id, row.seasonKey, row.stats);
          }
          updated += 1;
          teamUpdated += 1;
          if (seasons.filter((row) => isProductiveNbaRow(row.stats)).length >= 2) {
            multiSeason += 1;
          }
        } catch (error) {
          failed += 1;
          console.warn(`[NBA-HIST-TEST] FAIL ${player.fullName}:`, error);
        }
      }

      console.log(
        `[NBA-HIST-TEST] ${team.name}: ${players.length} no elenco · ${teamUpdated} atualizados`
      );
    }

    console.log(
      `[NBA-HIST-TEST] Concluído — processados: ${processed} · atualizados: ${updated}` +
        ` · multi-season: ${multiSeason} · sem dados: ${skipped} · falhas: ${failed}` +
        (onesOnly ? ` · skipped-not-ones: ${skippedNotOnes}` : "")
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error("[NBA-HIST-TEST] Erro fatal:", error);
  process.exit(1);
});
