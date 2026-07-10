/**
 * Carga leve — histórico NBA 202526 para jogadores já cadastrados.
 * Limita a N franquias (padrão: 3) para teste local sem rate limit.
 *
 * Uso: npm run data:sync-nba-teste
 *      npm run data:sync-nba-teste -- --teams=5
 */
import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

const SEASON_PAST = 202526;
const PAST_SEASON_LABEL = "2025-26";
const PAST_SEASON_FALLBACK_LABEL = "2024-25";
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

function isPastSeasonRow(season: EspnSeasonRef | undefined): boolean {
  if (!season) return false;
  if (seasonMatchesLabel(season, PAST_SEASON_LABEL)) return true;
  return season.year === 2026;
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

async function resolvePastSeasonStats(espnId: string): Promise<ParsedBasketballStats | null> {
  const nbaCategories = await fetchStatsCategories(espnId, "nba");
  const nbaRow =
    findSeasonRow(nbaCategories, isPastSeasonRow) ??
    findSeasonRow(nbaCategories, (season) => seasonMatchesLabel(season, "2025"));

  if (nbaRow) {
    const names = nbaCategories?.find((category) => category.name === "averages")?.names ?? [];
    const parsed = parseStatsRow(nbaRow, names);
    if (parsed) return parsed;
  }

  const ncaaCategories = await fetchStatsCategories(espnId, "mens-college-basketball");
  const ncaaRow =
    findSeasonRow(ncaaCategories, isPastSeasonRow) ??
    findSeasonRow(ncaaCategories, (season) =>
      seasonMatchesLabel(season, PAST_SEASON_FALLBACK_LABEL)
    );

  if (!ncaaRow) return null;

  const names = ncaaCategories?.find((category) => category.name === "averages")?.names ?? [];
  return parseStatsRow(ncaaRow, names);
}

async function upsertPastSeasonStats(
  prisma: PrismaClient,
  playerId: string,
  stats: ParsedBasketballStats
): Promise<void> {
  await prisma.playerSeasonStats.upsert({
    where: {
      playerId_season: { playerId, season: SEASON_PAST },
    },
    create: {
      playerId,
      season: SEASON_PAST,
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
  const prisma = new PrismaClient();

  try {
    console.log(`[NBA-HIST-TEST] Histórico ${SEASON_PAST} — limite: ${teamLimit} franquias`);

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
    let skipped = 0;
    let failed = 0;

    for (const team of teams) {
      console.log(`[NBA-HIST-TEST] Processando ${team.name}...`);

      const players = await prisma.player.findMany({
        where: {
          sport: "BASKETBALL",
          league: "NBA",
          teamId: team.id,
          apiSportsId: { not: null },
        },
        select: { id: true, fullName: true, apiSportsId: true },
        orderBy: { fullName: "asc" },
      });

      let teamUpdated = 0;

      for (const player of players) {
        processed += 1;

        try {
          const espnId = String(player.apiSportsId);
          const stats = await resolvePastSeasonStats(espnId);

          if (!stats) {
            skipped += 1;
            continue;
          }

          await upsertPastSeasonStats(prisma, player.id, stats);
          updated += 1;
          teamUpdated += 1;
        } catch (error) {
          failed += 1;
          console.warn(`[NBA-HIST-TEST] FAIL ${player.fullName}:`, error);
        }
      }

      console.log(
        `[NBA-HIST-TEST] ${team.name}: ${players.length} jogadores · ${teamUpdated} com histórico`
      );
    }

    console.log(
      `[NBA-HIST-TEST] Concluído — processados: ${processed} · atualizados: ${updated} · sem dados: ${skipped} · falhas: ${failed}`
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error("[NBA-HIST-TEST] Erro fatal:", error);
  process.exit(1);
});
