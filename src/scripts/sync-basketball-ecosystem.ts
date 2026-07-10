/**
 * Basquete unificado — NBA (elencos + histórico 2025/26) + NCAA (scouting 2026/27).
 *
 * Uso: npm run data:sync-basquete
 */
import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports/basketball";
const NBA_TEAMS_URL = `${ESPN_BASE}/nba/teams`;
const NBA_ROSTER_URL = (teamId: string) => `${ESPN_BASE}/nba/teams/${teamId}/roster`;
const NBA_STATS_URL = (espnId: string) =>
  `${ESPN_BASE}/nba/athletes/${espnId}/statistics`;
const NBA_STATS_FALLBACK_URL = (espnId: string, league = "nba") =>
  `https://site.api.espn.com/apis/common/v3/sports/basketball/nba/athletes/${espnId}/stats?league=${league}`;

const NCAA_TEAMS_URL = `${ESPN_BASE}/mens-college-basketball/teams?limit=500`;
const NCAA_ROSTER_URL = (teamId: string) =>
  `${ESPN_BASE}/mens-college-basketball/teams/${teamId}/roster`;

const SPORT = "BASKETBALL";
const LEAGUE_NBA = "NBA";
const LEAGUE_NCAA = "NCAA";
const SEASON_CURRENT = 202627;
const SEASON_PAST = 202526;
const PAST_SEASON_LABEL = "2025-26";
const PAST_SEASON_FALLBACK_LABEL = "2024-25";

const FETCH_HEADERS: HeadersInit = {
  "User-Agent": "football-intelligence-platform/1.0 (basketball-ecosystem-sync)",
  Accept: "application/json",
};

interface EspnTeamEntry {
  team: {
    id: string;
    displayName: string;
    abbreviation: string;
    color?: string;
    logos?: Array<{ href?: string }>;
  };
}

interface EspnTeamsResponse {
  sports?: Array<{
    leagues?: Array<{
      teams?: EspnTeamEntry[];
    }>;
  }>;
}

interface EspnAthlete {
  id: string;
  fullName?: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  height?: number;
  weight?: number;
  dateOfBirth?: string;
  headshot?: { href?: string };
  birthPlace?: { country?: string; city?: string; state?: string };
  position?: {
    name?: string;
    displayName?: string;
    abbreviation?: string;
  };
  status?: {
    type?: string;
    name?: string;
    abbreviation?: string;
  };
}

interface EspnRosterResponse {
  athletes?: EspnAthlete[];
}

interface EspnSeasonRef {
  year?: number;
  displayName?: string;
}

interface EspnStatRow {
  teamId?: string;
  teamSlug?: string;
  season?: EspnSeasonRef;
  stats?: string[];
  position?: string;
}

interface EspnStatsCategory {
  name?: string;
  displayName?: string;
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

interface PhaseCounters {
  players: number;
  created: number;
  currentStats: number;
  pastStats: number;
  failed: number;
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

function buildPlayerSlug(name: string): string {
  const slug = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return slug || "jogador";
}

function mapBasketballPosition(raw?: string): string {
  const value = (raw ?? "").trim().toLowerCase();
  if (!value) return "SF";

  if (value.includes("point guard") || value === "pg" || value === "guard") return "PG";
  if (value.includes("shooting guard") || value === "sg") return "SG";
  if (value.includes("small forward") || value === "sf") return "SF";
  if (value.includes("power forward") || value === "pf") return "PF";
  if (value.includes("center") || value === "c" || value === "centro") return "C";
  if (value.includes("forward")) return "SF";
  if (value.includes("guard")) return "PG";

  return "SF";
}

function parsePosition(athlete: EspnAthlete): string {
  const candidates = [
    athlete.position?.displayName,
    athlete.position?.name,
    athlete.position?.abbreviation,
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    return mapBasketballPosition(candidate);
  }

  return "Ala";
}

function parseDateOfBirth(raw?: string): Date {
  if (!raw?.trim()) return new Date(Date.UTC(2000, 0, 1));
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? new Date(Date.UTC(2000, 0, 1)) : parsed;
}

function inchesToCm(inches?: number): number {
  if (!inches || inches <= 0) return 200;
  return Math.round(inches * 2.54);
}

function lbsToKg(lbs?: number): number {
  if (!lbs || lbs <= 0) return 90;
  return Math.round(lbs * 0.453592);
}

function isActiveRosterAthlete(athlete: EspnAthlete): boolean {
  const statusType = athlete.status?.type?.toLowerCase() ?? "";
  const statusName = athlete.status?.name?.toLowerCase() ?? "";
  if (statusType === "active" || statusName === "active") return true;
  return !athlete.status;
}

function athleteLabel(athlete: EspnAthlete): string {
  return athlete.fullName ?? athlete.displayName ?? athlete.id;
}

function parseAthleteName(athlete: EspnAthlete): string {
  const fullName =
    athlete.fullName?.trim() ||
    athlete.displayName?.trim() ||
    `${athlete.firstName ?? ""} ${athlete.lastName ?? ""}`.trim();

  if (!fullName) throw new Error("Atleta sem nome");
  return fullName;
}

function throttleDelayMs(): number {
  return 50 + Math.floor(Math.random() * 26);
}

async function throttle(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, throttleDelayMs()));
}

async function fetchJson<T>(url: string, allowNotFound = false): Promise<T | null> {
  const response = await fetch(url, {
    headers: FETCH_HEADERS,
    signal: AbortSignal.timeout(45_000),
  });

  if (response.status === 404 && allowNotFound) return null;

  if (!response.ok) {
    throw new Error(`ESPN HTTP ${response.status} — ${url}`);
  }

  return (await response.json()) as T;
}

function zeroBasketballStats() {
  return {
    goals: 0,
    assists: 0,
    tackles: 0,
    interceptions: 0,
    passingAccuracy: 0,
    minutesPlayed: 0,
    matchesPlayed: 0,
    points: 0,
    rebounds: 0,
    steals: 0,
    blocks: 0,
    fieldGoalsPercent: 0,
    threePointsPercent: 0,
  };
}

function parseNumber(value?: string): number {
  if (!value?.trim()) return 0;
  const parsed = Number.parseFloat(value.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundInt(value: number): number {
  return Math.round(value);
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
  const avgRebounds = parseNumber(values[indexOf("avgRebounds")]);
  const avgSteals = parseNumber(values[indexOf("avgSteals")]);
  const avgBlocks = parseNumber(values[indexOf("avgBlocks")]);
  const avgAssists = parseNumber(values[indexOf("avgAssists")]);
  const fieldGoalPct = parseNumber(values[indexOf("fieldGoalPct")]);
  const threePointPct = parseNumber(values[indexOf("threePointFieldGoalPct")]);

  if (gamesPlayed <= 0 && avgPoints <= 0) return null;

  return {
    matchesPlayed: roundInt(gamesPlayed),
    minutesPlayed: roundInt(avgMinutes * gamesPlayed),
    points: roundInt(avgPoints),
    rebounds: roundInt(avgRebounds),
    steals: roundInt(avgSteals),
    blocks: roundInt(avgBlocks),
    assists: roundInt(avgAssists),
    fieldGoalsPercent: fieldGoalPct,
    threePointsPercent: threePointPct,
  };
}

async function fetchStatsCategories(
  espnId: string,
  league: "nba" | "mens-college-basketball" = "nba"
): Promise<EspnStatsCategory[] | null> {
  if (league === "nba") {
    await throttle();
    const primary = await fetchJson<unknown>(NBA_STATS_URL(espnId), true);
    if (primary && typeof primary === "object" && "categories" in primary) {
      const categories = (primary as EspnV3StatsResponse).categories;
      if (categories?.length) return categories;
    }
  }

  await throttle();
  const fallback = await fetchJson<EspnV3StatsResponse>(
    NBA_STATS_FALLBACK_URL(espnId, league),
    true
  );
  return fallback?.categories ?? null;
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

async function ensureCompetition(
  prisma: PrismaClient,
  name: string,
  espnSlug: string
): Promise<string> {
  const existing = await prisma.competition.findFirst({
    where: { name },
    select: { id: true },
  });

  if (existing) return existing.id;

  const created = await prisma.competition.create({
    data: {
      name,
      country: "United States",
      tier: name === LEAGUE_NBA ? 1 : 2,
      espnSlug,
    },
    select: { id: true },
  });

  return created.id;
}

async function upsertTeam(
  prisma: PrismaClient,
  competitionId: string,
  espnTeam: EspnTeamEntry["team"]
): Promise<string> {
  const espnTeamId = Number.parseInt(espnTeam.id, 10);
  const crestUrl = espnTeam.logos?.[0]?.href ?? null;

  const existing = await prisma.team.findFirst({
    where: {
      OR: [{ name: espnTeam.displayName }, { apiSportsId: espnTeamId }],
    },
    select: { id: true },
  });

  const teamData = {
    name: espnTeam.displayName,
    shortName: espnTeam.abbreviation,
    country: "United States",
    crestUrl,
    apiSportsId: espnTeamId,
    competitionId,
    dataSyncedSeason: String(SEASON_CURRENT),
    dataSyncedAt: new Date(),
  };

  if (existing) {
    await prisma.team.update({
      where: { id: existing.id },
      data: teamData,
    });
    return existing.id;
  }

  const created = await prisma.team.create({
    data: teamData,
    select: { id: true },
  });

  return created.id;
}

async function upsertPlayer(
  prisma: PrismaClient,
  athlete: EspnAthlete,
  teamId: string,
  league: string
): Promise<{ playerId: string; created: boolean }> {
  const fullName = parseAthleteName(athlete);
  const slug = buildPlayerSlug(fullName);
  const espnAthleteId = Number.parseInt(athlete.id, 10);
  const nationality = athlete.birthPlace?.country?.trim() || "United States";

  const existing = await prisma.player.findFirst({
    where: {
      sport: SPORT,
      league,
      OR: [
        ...(Number.isFinite(espnAthleteId) ? [{ apiSportsId: espnAthleteId }] : []),
        { fullName },
        { knownAs: slug },
      ],
    },
    select: { id: true },
  });

  const playerData = {
    fullName,
    knownAs: slug,
    dateOfBirth: parseDateOfBirth(athlete.dateOfBirth),
    nationality,
    position: parsePosition(athlete),
    height: inchesToCm(athlete.height),
    weight: lbsToKg(athlete.weight),
    photoUrl: athlete.headshot?.href ?? null,
    apiSportsId: Number.isFinite(espnAthleteId) ? espnAthleteId : null,
    sport: SPORT,
    league,
    teamId,
    dataSyncedSeason: String(SEASON_CURRENT),
    dataSyncedAt: new Date(),
  };

  if (existing) {
    await prisma.player.update({
      where: { id: existing.id },
      data: playerData,
    });
    return { playerId: existing.id, created: false };
  }

  const created = await prisma.player.create({
    data: {
      ...playerData,
      strengths: [],
      weaknesses: [],
    },
    select: { id: true },
  });

  return { playerId: created.id, created: true };
}

async function upsertSeasonStats(
  prisma: PrismaClient,
  playerId: string,
  season: number,
  stats?: Partial<ParsedBasketballStats>
): Promise<void> {
  const base = zeroBasketballStats();
  const payload = stats
    ? {
        ...base,
        matchesPlayed: stats.matchesPlayed ?? 0,
        minutesPlayed: stats.minutesPlayed ?? 0,
        points: stats.points ?? 0,
        rebounds: stats.rebounds ?? 0,
        steals: stats.steals ?? 0,
        blocks: stats.blocks ?? 0,
        assists: stats.assists ?? 0,
        fieldGoalsPercent: stats.fieldGoalsPercent ?? 0,
        threePointsPercent: stats.threePointsPercent ?? 0,
      }
    : base;

  await prisma.playerSeasonStats.upsert({
    where: {
      playerId_season: { playerId, season },
    },
    create: {
      playerId,
      season,
      ...payload,
    },
    update: stats ? payload : {},
  });
}

async function fetchTeams(url: string): Promise<EspnTeamEntry["team"][]> {
  await throttle();
  const payload = await fetchJson<EspnTeamsResponse>(url);
  if (!payload) return [];

  const teams = payload.sports?.[0]?.leagues?.[0]?.teams ?? [];
  return teams
    .map((entry) => entry.team)
    .filter((team) => team?.id && team.displayName)
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}

async function fetchTeamRoster(url: string): Promise<EspnAthlete[]> {
  await throttle();
  const payload = await fetchJson<EspnRosterResponse>(url);
  return (payload?.athletes ?? []).filter(isActiveRosterAthlete);
}

async function syncNbaPhase(prisma: PrismaClient): Promise<PhaseCounters> {
  const counters: PhaseCounters = {
    players: 0,
    created: 0,
    currentStats: 0,
    pastStats: 0,
    failed: 0,
  };

  console.log("[BASKET-SYNC][FASE 1] NBA — elencos + histórico 2025/26...");
  const competitionId = await ensureCompetition(prisma, LEAGUE_NBA, "nba");
  const teams = await fetchTeams(NBA_TEAMS_URL);

  console.log(`[BASKET-SYNC][FASE 1] ${teams.length} franquias NBA encontradas`);

  for (const espnTeam of teams) {
    console.log(`[BASKET-SYNC][FASE 1] Processando ${espnTeam.displayName}...`);

    try {
      const teamId = await upsertTeam(prisma, competitionId, espnTeam);
      const roster = await fetchTeamRoster(NBA_ROSTER_URL(espnTeam.id));

      let teamCount = 0;
      let teamCreated = 0;
      let teamPastStats = 0;

      for (const athlete of roster) {
        try {
          const espnAthleteId = athlete.id;
          const { playerId, created } = await upsertPlayer(prisma, athlete, teamId, LEAGUE_NBA);

          await upsertSeasonStats(prisma, playerId, SEASON_CURRENT);
          counters.currentStats += 1;

          const pastStats = await resolvePastSeasonStats(espnAthleteId);
          await upsertSeasonStats(prisma, playerId, SEASON_PAST, pastStats ?? undefined);

          teamCount += 1;
          counters.players += 1;
          if (pastStats) {
            teamPastStats += 1;
            counters.pastStats += 1;
          }
          if (created) {
            teamCreated += 1;
            counters.created += 1;
          }
        } catch (error) {
          counters.failed += 1;
          console.warn(`[BASKET-SYNC][FASE 1] FAIL jogador ${athleteLabel(athlete)}:`, error);
        }
      }

      console.log(
        `[BASKET-SYNC][FASE 1] ${espnTeam.displayName}: ${teamCount} jogadores (${teamCreated} novos, ${teamPastStats} com histórico ${SEASON_PAST})`
      );
    } catch (error) {
      counters.failed += 1;
      console.warn(`[BASKET-SYNC][FASE 1] FAIL time ${espnTeam.displayName}:`, error);
    }
  }

  return counters;
}

async function syncNcaaPhase(prisma: PrismaClient): Promise<PhaseCounters> {
  const counters: PhaseCounters = {
    players: 0,
    created: 0,
    currentStats: 0,
    pastStats: 0,
    failed: 0,
  };

  console.log("[BASKET-SYNC][FASE 2] NCAA — universidades + scouting 2026/27...");
  const competitionId = await ensureCompetition(prisma, "NCAA Men's Basketball", "mens-college-basketball");
  const teams = await fetchTeams(NCAA_TEAMS_URL);

  console.log(`[BASKET-SYNC][FASE 2] ${teams.length} universidades encontradas`);

  for (const espnTeam of teams) {
    console.log(`[BASKET-SYNC][FASE 2] Processando ${espnTeam.displayName}...`);

    try {
      const teamId = await upsertTeam(prisma, competitionId, espnTeam);
      const roster = await fetchTeamRoster(NCAA_ROSTER_URL(espnTeam.id));

      let teamCount = 0;
      let teamCreated = 0;

      for (const athlete of roster) {
        try {
          const { playerId, created } = await upsertPlayer(
            prisma,
            athlete,
            teamId,
            LEAGUE_NCAA
          );

          await upsertSeasonStats(prisma, playerId, SEASON_CURRENT);

          teamCount += 1;
          counters.players += 1;
          counters.currentStats += 1;
          if (created) {
            teamCreated += 1;
            counters.created += 1;
          }
        } catch (error) {
          counters.failed += 1;
          console.warn(`[BASKET-SYNC][FASE 2] FAIL jogador ${athleteLabel(athlete)}:`, error);
        }
      }

      console.log(
        `[BASKET-SYNC][FASE 2] ${espnTeam.displayName}: ${teamCount} prospectos (${teamCreated} novos)`
      );
    } catch (error) {
      counters.failed += 1;
      console.warn(`[BASKET-SYNC][FASE 2] FAIL universidade ${espnTeam.displayName}:`, error);
    }
  }

  return counters;
}

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error("DATABASE_URL ausente. Configure .env antes de executar o sync.");
  }

  const prisma = new PrismaClient();

  try {
    console.log("[BASKET-SYNC] Iniciando pipeline unificado de basquete...");

    const nba = await syncNbaPhase(prisma);
    const ncaa = await syncNcaaPhase(prisma);

    console.log(
      `[BASKET-SYNC] Concluído — NBA: ${nba.players} jogadores (${nba.created} novos, ${nba.pastStats} linhas ${SEASON_PAST}) · NCAA: ${ncaa.players} prospectos (${ncaa.created} novos, ${ncaa.currentStats} linhas ${SEASON_CURRENT}) · falhas: ${nba.failed + ncaa.failed}`
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error("[BASKET-SYNC] Erro fatal:", error);
  process.exit(1);
});
