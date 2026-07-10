/**
 * NBA — cadastro de 30 franquias + elencos ativos via ESPN API.
 * Prepara PlayerSeasonStats base para a temporada 2026/27 (season: 202627).
 *
 * Uso: npm run data:sync-nba-elencos
 */
import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { parseCapHitFromAthlete } from "@/lib/api/nba-salaries";

const NBA_TEAMS_URL = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams";
const NBA_ROSTER_URL = (teamId: string) =>
  `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/${teamId}/roster`;

const SPORT = "BASKETBALL";
const LEAGUE = "NBA";
const SEASON = 202627;
const COMPETITION_NAME = "NBA";
const FETCH_DELAY_MS = 350;

const FETCH_HEADERS: HeadersInit = {
  "User-Agent": "football-intelligence-platform/1.0 (nba-roster-sync)",
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
  contract?: {
    salary?: number;
    incomingTradeValue?: number;
    outgoingTradeValue?: number;
  };
}

interface EspnRosterResponse {
  athletes?: EspnAthlete[];
  team?: { displayName?: string };
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

function mapNbaPosition(raw?: string): string {
  const value = (raw ?? "").trim().toLowerCase();
  if (!value) return "Ala";

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
    const mapped = mapNbaPosition(candidate);
    if (mapped) return mapped;
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

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: FETCH_HEADERS,
    signal: AbortSignal.timeout(45_000),
  });

  if (!response.ok) {
    throw new Error(`ESPN HTTP ${response.status} — ${url}`);
  }

  return (await response.json()) as T;
}

async function ensureNbaCompetition(prisma: PrismaClient): Promise<string> {
  const existing = await prisma.competition.findFirst({
    where: { name: COMPETITION_NAME },
    select: { id: true },
  });

  if (existing) return existing.id;

  const created = await prisma.competition.create({
    data: {
      name: COMPETITION_NAME,
      country: "United States",
      tier: 1,
      espnSlug: "nba",
    },
    select: { id: true },
  });

  return created.id;
}

async function upsertNbaTeam(
  prisma: PrismaClient,
  competitionId: string,
  espnTeam: EspnTeamEntry["team"]
): Promise<string> {
  const espnTeamId = Number.parseInt(espnTeam.id, 10);
  const crestUrl = espnTeam.logos?.[0]?.href ?? null;

  const existing = await prisma.team.findFirst({
    where: {
      competitionId,
      OR: [
        { name: espnTeam.displayName },
        ...(Number.isFinite(espnTeamId) ? [{ apiSportsId: espnTeamId }] : []),
      ],
    },
    select: { id: true },
  });

  if (existing) {
    await prisma.team.update({
      where: { id: existing.id },
      data: {
        name: espnTeam.displayName,
        shortName: espnTeam.abbreviation,
        country: "United States",
        crestUrl,
        apiSportsId: espnTeamId,
        competitionId,
        dataSyncedSeason: String(SEASON),
        dataSyncedAt: new Date(),
      },
    });
    return existing.id;
  }

  const created = await prisma.team.create({
    data: {
      name: espnTeam.displayName,
      shortName: espnTeam.abbreviation,
      country: "United States",
      crestUrl,
      apiSportsId: espnTeamId,
      competitionId,
      dataSyncedSeason: String(SEASON),
      dataSyncedAt: new Date(),
    },
    select: { id: true },
  });

  return created.id;
}

async function upsertNbaPlayer(
  prisma: PrismaClient,
  athlete: EspnAthlete,
  teamId: string
): Promise<{ playerId: string; created: boolean }> {
  const fullName =
    athlete.fullName?.trim() ||
    athlete.displayName?.trim() ||
    `${athlete.firstName ?? ""} ${athlete.lastName ?? ""}`.trim();

  if (!fullName) {
    throw new Error("Atleta sem nome");
  }

  const slug = buildPlayerSlug(fullName);
  const espnAthleteId = Number.parseInt(athlete.id, 10);
  const nationality = athlete.birthPlace?.country?.trim() || "United States";

  const existing = await prisma.player.findFirst({
    where: {
      sport: SPORT,
      league: LEAGUE,
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
    capHit: parseCapHitFromAthlete(athlete),
    sport: SPORT,
    league: LEAGUE,
    teamId,
    dataSyncedSeason: String(SEASON),
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

async function upsertBaseSeasonStats(prisma: PrismaClient, playerId: string): Promise<void> {
  await prisma.playerSeasonStats.upsert({
    where: {
      playerId_season: {
        playerId,
        season: SEASON,
      },
    },
    create: {
      playerId,
      season: SEASON,
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
    },
    update: {},
  });
}

async function fetchNbaTeams(): Promise<EspnTeamEntry["team"][]> {
  const payload = await fetchJson<EspnTeamsResponse>(NBA_TEAMS_URL);
  const teams = payload.sports?.[0]?.leagues?.[0]?.teams ?? [];

  return teams
    .map((entry) => entry.team)
    .filter((team) => team?.id && team.displayName)
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}

async function fetchTeamRoster(teamId: string): Promise<EspnAthlete[]> {
  const payload = await fetchJson<EspnRosterResponse>(NBA_ROSTER_URL(teamId));
  return (payload.athletes ?? []).filter(isActiveRosterAthlete);
}

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error("DATABASE_URL ausente. Configure .env antes de executar o sync.");
  }

  const prisma = new PrismaClient();

  try {
    console.log("[NBA-SYNC] Iniciando cadastro de franquias e elencos NBA...");
    const competitionId = await ensureNbaCompetition(prisma);
    const teams = await fetchNbaTeams();

    console.log(`[NBA-SYNC] ${teams.length} franquias encontradas na ESPN`);

    let totalPlayers = 0;
    let playersCreated = 0;
    let statsUpserted = 0;
    let failed = 0;

    for (const espnTeam of teams) {
      console.log(`[NBA-SYNC] Processando ${espnTeam.displayName}...`);

      try {
        const teamId = await upsertNbaTeam(prisma, competitionId, espnTeam);
        await sleep(FETCH_DELAY_MS);

        const roster = await fetchTeamRoster(espnTeam.id);
        let teamCount = 0;
        let teamCreated = 0;

        for (const athlete of roster) {
          try {
            const { playerId, created } = await upsertNbaPlayer(prisma, athlete, teamId);
            await upsertBaseSeasonStats(prisma, playerId);

            teamCount += 1;
            totalPlayers += 1;
            statsUpserted += 1;
            if (created) {
              teamCreated += 1;
              playersCreated += 1;
            }
          } catch (error) {
            failed += 1;
            const label = athlete.fullName ?? athlete.displayName ?? athlete.id;
            console.warn(`[NBA-SYNC] FAIL jogador ${label}:`, error);
          }
        }

        console.log(
          `[NBA-SYNC] ${espnTeam.displayName}: ${teamCount} jogadores (${teamCreated} novos)`
        );
      } catch (error) {
        failed += 1;
        console.warn(`[NBA-SYNC] FAIL time ${espnTeam.displayName}:`, error);
      }

      await sleep(FETCH_DELAY_MS);
    }

    console.log(
      `[NBA-SYNC] Concluído — franquias: ${teams.length} · jogadores: ${totalPlayers} · criados: ${playersCreated} · stats ${SEASON}: ${statsUpserted} · falhas: ${failed}`
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error("[NBA-SYNC] Erro fatal:", error);
  process.exit(1);
});
