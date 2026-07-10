/**
 * NCAA — sincroniza elencos das universidades elite já cadastradas no banco.
 * Complementa `data:sync-ncaa-teams` (que só grava franquias).
 *
 * Uso: npm run data:sync-ncaa-rosters
 */
import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

const NCAA_ROSTER_URL = (espnTeamId: string) =>
  `https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/teams/${espnTeamId}/roster`;

const SPORT = "BASKETBALL";
const LEAGUE = "NCAA";
const COMPETITION_NAME = "NCAA Men's Basketball";
const SEASON = 202627;
const FETCH_DELAY_MS = 300;

const FETCH_HEADERS: HeadersInit = {
  "User-Agent": "football-intelligence-platform/1.0 (ncaa-rosters-sync)",
  Accept: "application/json",
};

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
  birthPlace?: { country?: string };
  position?: { name?: string; displayName?: string; abbreviation?: string };
  status?: { type?: string; name?: string };
}

interface EspnRosterResponse {
  athletes?: EspnAthlete[];
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
  return (
    name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "jogador"
  );
}

function mapPosition(athlete: EspnAthlete): string {
  const raw =
    athlete.position?.abbreviation ??
    athlete.position?.displayName ??
    athlete.position?.name ??
    "";
  const value = raw.toLowerCase();
  if (value.includes("point") || value === "pg") return "PG";
  if (value.includes("shooting") || value === "sg") return "SG";
  if (value.includes("small") || value === "sf") return "SF";
  if (value.includes("power") || value === "pf") return "PF";
  if (value.includes("center") || value === "c") return "C";
  if (value.includes("guard")) return "PG";
  if (value.includes("forward")) return "SF";
  return "SF";
}

function parseDateOfBirth(raw?: string): Date {
  if (!raw?.trim()) return new Date(Date.UTC(2002, 0, 1));
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? new Date(Date.UTC(2002, 0, 1)) : parsed;
}

function inchesToCm(inches?: number): number {
  return !inches || inches <= 0 ? 200 : Math.round(inches * 2.54);
}

function lbsToKg(lbs?: number): number {
  return !lbs || lbs <= 0 ? 90 : Math.round(lbs * 0.453592);
}

function isActiveAthlete(athlete: EspnAthlete): boolean {
  const type = athlete.status?.type?.toLowerCase() ?? "";
  const name = athlete.status?.name?.toLowerCase() ?? "";
  if (type === "active" || name === "active") return true;
  return !athlete.status;
}

function parseName(athlete: EspnAthlete): string {
  const fullName =
    athlete.fullName?.trim() ||
    athlete.displayName?.trim() ||
    `${athlete.firstName ?? ""} ${athlete.lastName ?? ""}`.trim();
  if (!fullName) throw new Error("Atleta sem nome");
  return fullName;
}

async function fetchRoster(espnTeamId: string): Promise<EspnAthlete[]> {
  const response = await fetch(NCAA_ROSTER_URL(espnTeamId), {
    headers: FETCH_HEADERS,
    signal: AbortSignal.timeout(45_000),
  });
  if (!response.ok) throw new Error(`ESPN roster HTTP ${response.status}`);
  const payload = (await response.json()) as EspnRosterResponse;
  return (payload.athletes ?? []).filter(isActiveAthlete);
}

async function upsertPlayer(
  prisma: PrismaClient,
  athlete: EspnAthlete,
  teamId: string
): Promise<{ created: boolean }> {
  const fullName = parseName(athlete);
  const slug = buildPlayerSlug(fullName);
  const espnId = Number.parseInt(athlete.id, 10);

  const existing = await prisma.player.findFirst({
    where: {
      sport: SPORT,
      league: LEAGUE,
      OR: [
        ...(Number.isFinite(espnId) ? [{ apiSportsId: espnId }] : []),
        { fullName },
        { knownAs: slug },
      ],
    },
    select: { id: true },
  });

  const data = {
    fullName,
    knownAs: slug,
    dateOfBirth: parseDateOfBirth(athlete.dateOfBirth),
    nationality: athlete.birthPlace?.country?.trim() || "United States",
    position: mapPosition(athlete),
    height: inchesToCm(athlete.height),
    weight: lbsToKg(athlete.weight),
    photoUrl: athlete.headshot?.href ?? null,
    apiSportsId: Number.isFinite(espnId) ? espnId : null,
    sport: SPORT,
    league: LEAGUE,
    teamId,
    dataSyncedSeason: String(SEASON),
    dataSyncedAt: new Date(),
  };

  let playerId: string;
  let created = false;

  if (existing) {
    await prisma.player.update({ where: { id: existing.id }, data });
    playerId = existing.id;
  } else {
    const row = await prisma.player.create({
      data: { ...data, strengths: [], weaknesses: [] },
      select: { id: true },
    });
    playerId = row.id;
    created = true;
  }

  await prisma.playerSeasonStats.upsert({
    where: { playerId_season: { playerId, season: SEASON } },
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

  return { created };
}

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error("DATABASE_URL ausente.");
  }

  const prisma = new PrismaClient();

  try {
    const competition = await prisma.competition.findFirst({
      where: { name: COMPETITION_NAME },
      select: { id: true },
    });

    if (!competition) {
      throw new Error("Competição NCAA não encontrada. Rode npm run data:sync-ncaa-teams primeiro.");
    }

    const teams = await prisma.team.findMany({
      where: { competitionId: competition.id, apiSportsId: { not: null } },
      select: { id: true, name: true, apiSportsId: true },
      orderBy: { name: "asc" },
    });

    console.log(`[NCAA-ROSTERS] ${teams.length} universidades elite no banco.`);

    let players = 0;
    let created = 0;
    let failed = 0;
    let empty = 0;

    for (const team of teams) {
      const espnId = String(team.apiSportsId);
      process.stdout.write(`[NCAA-ROSTERS] ${team.name}... `);

      try {
        await new Promise((r) => setTimeout(r, FETCH_DELAY_MS));
        const roster = await fetchRoster(espnId);

        if (!roster.length) {
          empty += 1;
          console.log("elenco vazio (off-season)");
          continue;
        }

        let teamCount = 0;
        for (const athlete of roster) {
          try {
            const result = await upsertPlayer(prisma, athlete, team.id);
            players += 1;
            teamCount += 1;
            if (result.created) created += 1;
          } catch (error) {
            failed += 1;
            console.warn(`\n  FAIL ${parseName(athlete)}:`, error);
          }
        }

        console.log(`${teamCount} jogadores`);
      } catch (error) {
        failed += 1;
        console.log(`erro — ${error instanceof Error ? error.message : error}`);
      }
    }

    console.log(
      `[NCAA-ROSTERS] Concluído — ${players} jogadores · ${created} novos · ${empty} elencos vazios · ${failed} falhas`
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("[NCAA-ROSTERS] Erro fatal:", error);
  process.exit(1);
});
