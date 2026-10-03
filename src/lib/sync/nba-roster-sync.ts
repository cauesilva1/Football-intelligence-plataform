/**
 * NBA franchises + active rosters from ESPN, with an optional time budget so the
 * daily cron can run it after boxscores without risking the 300s function limit.
 */
import type { PrismaClient } from "@prisma/client";
import { parseCapHitFromAthlete } from "@/lib/api/nba-salaries";
import { resolveNbaBoxscoreSeason } from "@/lib/basketball/season";
import { getPrisma } from "@/lib/prisma";

const NBA_TEAMS_URL = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams";
const NBA_ROSTER_URL = (teamId: string) =>
  `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/${teamId}/roster`;

const SPORT = "BASKETBALL";
const LEAGUE = "NBA";
const COMPETITION_NAME = "NBA";
const DEFAULT_FETCH_DELAY_MS = 350;
const DEFAULT_STALE_MS = 48 * 60 * 60 * 1000;
/** Rough upper bound for one franchise (2 fetches + ~15 players × 3 queries). */
const MIN_MS_PER_TEAM = 20_000;

const FETCH_HEADERS: HeadersInit = {
  "User-Agent": "football-intelligence-platform/1.0 (nba-roster-sync)",
  Accept: "application/json",
};

interface EspnTeam {
  id: string;
  displayName: string;
  abbreviation: string;
  logos?: Array<{ href?: string }>;
}

interface EspnTeamsResponse {
  sports?: Array<{ leagues?: Array<{ teams?: Array<{ team: EspnTeam }> }> }>;
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
  birthPlace?: { country?: string };
  position?: { name?: string; displayName?: string; abbreviation?: string };
  status?: { type?: string; name?: string };
  contract?: {
    salary?: number;
    incomingTradeValue?: number;
    outgoingTradeValue?: number;
  };
}

interface EspnRosterResponse {
  athletes?: EspnAthlete[];
}

export interface NbaRosterSyncOptions {
  /** Epoch ms after which no new franchise is started. */
  deadlineMs?: number;
  /** Cap franchises processed in one run. */
  maxTeams?: number;
  /** Ignore the stale window and refresh every franchise. */
  force?: boolean;
  /** Franchises refreshed more recently than this are skipped (default 48h). */
  staleMs?: number;
  fetchDelayMs?: number;
  now?: Date;
  prisma?: PrismaClient;
  log?: (message: string) => void;
}

export interface NbaRosterSyncResult {
  season: number;
  franchisesTotal: number;
  franchisesSynced: number;
  franchisesSkippedFresh: number;
  franchisesDeferred: number;
  players: number;
  playersCreated: number;
  failed: number;
  timedOut: boolean;
}

export function buildPlayerSlug(name: string): string {
  const slug = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return slug || "jogador";
}

export function mapNbaPosition(raw?: string): string {
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

export function isActiveRosterAthlete(athlete: EspnAthlete): boolean {
  const statusType = athlete.status?.type?.toLowerCase() ?? "";
  const statusName = athlete.status?.name?.toLowerCase() ?? "";
  if (statusType === "active" || statusName === "active") return true;
  return !athlete.status;
}

/**
 * Stalest franchises first (never synced / other season before recently synced), so a
 * time-boxed run always advances through the league instead of restarting alphabetically.
 */
export function orderTeamsByStaleness<T extends { key: string }>(
  teams: T[],
  lastSyncByKey: Map<string, number>
): T[] {
  return [...teams].sort((a, b) => {
    const la = lastSyncByKey.get(a.key) ?? 0;
    const lb = lastSyncByKey.get(b.key) ?? 0;
    return la - lb;
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: FETCH_HEADERS,
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    throw new Error(`ESPN HTTP ${response.status} — ${url}`);
  }

  return (await response.json()) as T;
}

async function fetchNbaTeams(): Promise<EspnTeam[]> {
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

export async function ensureNbaCompetitionRow(prisma: PrismaClient): Promise<string> {
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
  espnTeam: EspnTeam,
  season: number
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

  const data = {
    name: espnTeam.displayName,
    shortName: espnTeam.abbreviation,
    country: "United States",
    crestUrl,
    apiSportsId: Number.isFinite(espnTeamId) ? espnTeamId : null,
    competitionId,
    dataSyncedSeason: String(season),
    dataSyncedAt: new Date(),
  };

  if (existing) {
    await prisma.team.update({ where: { id: existing.id }, data });
    return existing.id;
  }

  const created = await prisma.team.create({ data, select: { id: true } });
  return created.id;
}

async function upsertNbaPlayer(
  prisma: PrismaClient,
  athlete: EspnAthlete,
  teamId: string,
  season: number
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
    dataSyncedSeason: String(season),
    dataSyncedAt: new Date(),
  };

  if (existing) {
    await prisma.player.update({ where: { id: existing.id }, data: playerData });
    return { playerId: existing.id, created: false };
  }

  const created = await prisma.player.create({
    data: { ...playerData, strengths: [], weaknesses: [] },
    select: { id: true },
  });

  return { playerId: created.id, created: true };
}

async function upsertBaseSeasonStats(
  prisma: PrismaClient,
  playerId: string,
  season: number
): Promise<void> {
  await prisma.playerSeasonStats.upsert({
    where: { playerId_season: { playerId, season } },
    create: {
      playerId,
      season,
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

export async function syncNbaRosters(
  options: NbaRosterSyncOptions = {}
): Promise<NbaRosterSyncResult> {
  const prisma = options.prisma ?? getPrisma();
  const now = options.now ?? new Date();
  const season = resolveNbaBoxscoreSeason(now);
  const log = options.log ?? ((message: string) => console.log(`[NBA-SYNC] ${message}`));
  const staleMs = options.staleMs ?? DEFAULT_STALE_MS;
  const delayMs = options.fetchDelayMs ?? DEFAULT_FETCH_DELAY_MS;

  const competitionId = await ensureNbaCompetitionRow(prisma);
  const espnTeams = await fetchNbaTeams();
  log(`${espnTeams.length} franquias na ESPN · temporada ${season}`);

  const dbTeams = await prisma.team.findMany({
    where: { competitionId, apiSportsId: { not: null } },
    select: { apiSportsId: true, dataSyncedSeason: true, dataSyncedAt: true },
  });
  const lastSyncByKey = new Map<string, number>();
  for (const team of dbTeams) {
    if (team.dataSyncedSeason === String(season) && team.dataSyncedAt) {
      lastSyncByKey.set(String(team.apiSportsId), team.dataSyncedAt.getTime());
    }
  }

  const ordered = orderTeamsByStaleness(
    espnTeams.map((team) => ({ key: team.id, team })),
    lastSyncByKey
  );

  const result: NbaRosterSyncResult = {
    season,
    franchisesTotal: espnTeams.length,
    franchisesSynced: 0,
    franchisesSkippedFresh: 0,
    franchisesDeferred: 0,
    players: 0,
    playersCreated: 0,
    failed: 0,
    timedOut: false,
  };

  const maxTeams = options.maxTeams ?? Number.POSITIVE_INFINITY;

  for (const { key, team } of ordered) {
    const lastSync = lastSyncByKey.get(key);
    if (!options.force && lastSync != null && Date.now() - lastSync < staleMs) {
      result.franchisesSkippedFresh += 1;
      continue;
    }

    const outOfTime =
      options.deadlineMs != null && Date.now() + MIN_MS_PER_TEAM > options.deadlineMs;
    if (outOfTime || result.franchisesSynced >= maxTeams) {
      result.franchisesDeferred += 1;
      result.timedOut = result.timedOut || outOfTime;
      continue;
    }

    try {
      const teamId = await upsertNbaTeam(prisma, competitionId, team, season);
      await sleep(delayMs);

      const roster = await fetchTeamRoster(team.id);
      let teamCount = 0;
      let teamCreated = 0;

      for (const athlete of roster) {
        try {
          const { playerId, created } = await upsertNbaPlayer(prisma, athlete, teamId, season);
          await upsertBaseSeasonStats(prisma, playerId, season);
          teamCount += 1;
          if (created) teamCreated += 1;
        } catch (error) {
          result.failed += 1;
          const label = athlete.fullName ?? athlete.displayName ?? athlete.id;
          console.warn(`[NBA-SYNC] FAIL jogador ${label}:`, error);
        }
      }

      result.franchisesSynced += 1;
      result.players += teamCount;
      result.playersCreated += teamCreated;
      log(
        `${team.displayName}: ${teamCount} jogadores (${teamCreated} novos) · ${result.franchisesSynced} franquias nesta execução`
      );
    } catch (error) {
      result.failed += 1;
      console.warn(`[NBA-SYNC] FAIL time ${team.displayName}:`, error);
    }

    await sleep(delayMs);
  }

  log(
    `Resumo — franquias: ${result.franchisesSynced} sincronizadas · ${result.franchisesSkippedFresh} recentes · ${result.franchisesDeferred} adiadas · jogadores: ${result.players} (${result.playersCreated} novos) · falhas: ${result.failed}`
  );

  return result;
}
