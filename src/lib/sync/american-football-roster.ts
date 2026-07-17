import { getPrisma } from "@/lib/prisma";
import { canUseDatabase } from "@/lib/system-cache";
import {
  resolveAmericanFootballLeagueFromCompetition,
  type AmericanFootballLeagueCode,
} from "@/lib/american-football/team-league";
import {
  encodeFootballStatsForPrisma,
  fetchFootballAthleteSeasonStats,
  zeroFootballStatsForPrisma,
  type ParsedFootballSeasonStats,
} from "@/lib/api/espn-football-athlete-stats";
import { footballSeasonLabel, resolveFootballHubSeasonYears } from "@/lib/api/espn-football-seasons";

const ESPN_SITE = "https://site.api.espn.com/apis/site/v2/sports/football";

interface EspnAthlete {
  id?: string;
  displayName?: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  jersey?: string;
  dateOfBirth?: string;
  height?: number;
  weight?: number;
  headshot?: { href?: string } | null;
  position?: { abbreviation?: string; name?: string; displayName?: string };
  birthPlace?: { country?: string };
}

function espnSlugForLeague(league: AmericanFootballLeagueCode): string {
  return league === "NFL" ? "nfl" : "college-football";
}

function buildPlayerSlug(fullName: string): string {
  return fullName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function parsePosition(athlete: EspnAthlete): string {
  return (
    athlete.position?.abbreviation?.trim() ||
    athlete.position?.displayName?.trim() ||
    athlete.position?.name?.trim() ||
    "WR"
  );
}

function inchesToCm(inches?: number): number | null {
  if (!inches || !Number.isFinite(inches)) return null;
  return Math.round(inches * 2.54);
}

function lbsToKg(lbs?: number): number | null {
  if (!lbs || !Number.isFinite(lbs)) return null;
  return Math.round(lbs * 0.453592);
}

function parseDateOfBirth(value?: string): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

async function fetchRoster(
  league: AmericanFootballLeagueCode,
  espnTeamId: number
): Promise<EspnAthlete[]> {
  const url = `${ESPN_SITE}/${espnSlugForLeague(league)}/teams/${espnTeamId}/roster`;
  const response = await fetch(url, {
    headers: {
      "User-Agent": "football-intelligence-platform/1.0 (af-roster)",
      Accept: "application/json",
    },
    next: { revalidate: 0 },
    signal: AbortSignal.timeout(25_000),
  });
  if (!response.ok) {
    console.warn(`[af-roster] HTTP ${response.status} on ${url}`);
    return [];
  }
  const data = (await response.json()) as {
    athletes?: Array<{ items?: EspnAthlete[] } | EspnAthlete>;
  };

  const athletes: EspnAthlete[] = [];
  for (const entry of data.athletes ?? []) {
    if (entry && typeof entry === "object" && "items" in entry && Array.isArray(entry.items)) {
      athletes.push(...entry.items);
    } else if (entry && typeof entry === "object" && "id" in entry) {
      athletes.push(entry as EspnAthlete);
    }
  }
  return athletes;
}

async function upsertSeasonRow(
  playerId: string,
  season: number,
  stats?: ParsedFootballSeasonStats | null
): Promise<void> {
  const prisma = getPrisma();
  const payload = stats ? encodeFootballStatsForPrisma(stats) : zeroFootballStatsForPrisma();

  await prisma.playerSeasonStats.upsert({
    where: { playerId_season: { playerId, season } },
    create: { playerId, season, ...payload },
    // Stub rows: don't wipe production if we already have past-season stats.
    update: stats ? payload : {},
  });
}

/**
 * Dual-season rows like basketball: past (with ESPN production when available)
 * + current/upcoming stub for the season about to start.
 *
 * Mass sync should pass fetchPastStats=false (stubs only).
 * Player profile should pass fetchPastStats=true (one ESPN call).
 */
export async function ensureAmericanFootballPlayerSeasons(options: {
  playerId: string;
  espnAthleteId?: number | null;
  league: AmericanFootballLeagueCode;
  /** Fetch ESPN past-season stats. Default false (stubs only — fast). */
  fetchPastStats?: boolean;
  timeoutMs?: number;
}): Promise<boolean> {
  if (!canUseDatabase()) return false;

  const prisma = getPrisma();
  const { pastYear, currentYear } = resolveFootballHubSeasonYears();
  const fetchPast = options.fetchPastStats === true && options.espnAthleteId != null;

  const existingPast = await prisma.playerSeasonStats.findUnique({
    where: { playerId_season: { playerId: options.playerId, season: pastYear } },
    select: { points: true, goals: true, tackles: true, steals: true },
  });
  const existingCurrent = await prisma.playerSeasonStats.findUnique({
    where: { playerId_season: { playerId: options.playerId, season: currentYear } },
    select: { id: true },
  });
  const pastHasSignal =
    !!existingPast &&
    ((existingPast.points ?? 0) > 0 ||
      (existingPast.goals ?? 0) > 0 ||
      (existingPast.tackles ?? 0) > 0 ||
      (existingPast.steals ?? 0) > 0);

  // Both season rows already present and we are not fetching ESPN — nothing to do.
  if (existingPast && existingCurrent && (!fetchPast || pastHasSignal)) {
    return false;
  }

  // Always ensure upcoming stub exists.
  if (!existingCurrent) {
    await upsertSeasonRow(options.playerId, currentYear, null);
  }

  if (pastHasSignal) {
    return false;
  }

  let pastStats: ParsedFootballSeasonStats | null = null;
  let fetched = false;
  if (fetchPast && options.espnAthleteId != null) {
    pastStats = await fetchFootballAthleteSeasonStats({
      espnAthleteId: options.espnAthleteId,
      league: options.league,
      seasonYear: pastYear,
      timeoutMs: options.timeoutMs ?? 12_000,
    });
    fetched = pastStats != null;
  }

  await upsertSeasonRow(options.playerId, pastYear, pastStats);

  await prisma.player.update({
    where: { id: options.playerId },
    data: {
      dataSyncedSeason: footballSeasonLabel(currentYear),
      dataSyncedAt: new Date(),
    },
  });

  return fetched;
}

/**
 * Sync roster for one NFL/CFB team when the squad is thin (or force=true).
 * Always ensures dual-season stats rows (past + upcoming).
 */
export async function ensureAmericanFootballTeamRoster(options: {
  teamId: string;
  competitionName?: string | null;
  espnTeamId?: number | null;
  minPlayers?: number;
  force?: boolean;
  /** When true, skip ESPN athlete stats (stubs only). Default true for speed. */
  skipStats?: boolean;
}): Promise<number> {
  if (!canUseDatabase()) return 0;

  const league = resolveAmericanFootballLeagueFromCompetition(options.competitionName);
  if (!league || !options.espnTeamId) return 0;
  const leagueCode: AmericanFootballLeagueCode = league;

  const prisma = getPrisma();
  const minPlayers = options.minPlayers ?? 20;
  const skipStats = options.skipStats !== false;
  const { pastYear, currentYear } = resolveFootballHubSeasonYears();

  const existingCount = await prisma.player.count({
    where: {
      teamId: options.teamId,
      sport: "AMERICAN_FOOTBALL",
      league: leagueCode,
    },
  });

  // Roster already full — still backfill dual-season stubs (no ESPN mass fetch).
  if (!options.force && existingCount >= minPlayers) {
    if (!skipStats) {
      const players = await prisma.player.findMany({
        where: { teamId: options.teamId, sport: "AMERICAN_FOOTBALL", league: leagueCode },
        select: { id: true, apiSportsId: true },
      });
      for (const player of players) {
        await ensureAmericanFootballPlayerSeasons({
          playerId: player.id,
          espnAthleteId: player.apiSportsId,
          league: leagueCode,
          fetchPastStats: true,
        });
      }
    }
    return existingCount;
  }

  let athletes: EspnAthlete[] = [];
  try {
    athletes = await fetchRoster(leagueCode, options.espnTeamId);
  } catch (error) {
    console.warn("[af-roster] fetch failed:", error);
    return existingCount;
  }
  if (!athletes.length) return existingCount;

  const espnIds = athletes
    .map((a) => Number.parseInt(a.id ?? "", 10))
    .filter((id) => Number.isFinite(id));

  const [teamPlayers, espnMatches] = await Promise.all([
    prisma.player.findMany({
      where: { teamId: options.teamId, sport: "AMERICAN_FOOTBALL", league: leagueCode },
      select: { id: true, apiSportsId: true, fullName: true, knownAs: true },
    }),
    espnIds.length
      ? prisma.player.findMany({
          where: {
            sport: "AMERICAN_FOOTBALL",
            league: leagueCode,
            apiSportsId: { in: espnIds },
          },
          select: { id: true, apiSportsId: true, fullName: true, knownAs: true },
        })
      : Promise.resolve([]),
  ]);

  const byEspnId = new Map<number, string>();
  const byName = new Map<string, string>();
  const bySlug = new Map<string, string>();
  for (const p of [...espnMatches, ...teamPlayers]) {
    if (p.apiSportsId != null) byEspnId.set(p.apiSportsId, p.id);
    byName.set(p.fullName.toLowerCase(), p.id);
    bySlug.set(p.knownAs, p.id);
  }

  const CONCURRENCY = 8;
  let upserted = 0;
  let cursor = 0;

  async function upsertOne(athlete: EspnAthlete): Promise<boolean> {
    const fullName =
      athlete.fullName?.trim() ||
      athlete.displayName?.trim() ||
      `${athlete.firstName ?? ""} ${athlete.lastName ?? ""}`.trim();
    if (!fullName) return false;

    const espnAthleteId = Number.parseInt(athlete.id ?? "", 10);
    const slug = buildPlayerSlug(fullName);
    const nationality = athlete.birthPlace?.country?.trim() || "United States";

    const existingId =
      (Number.isFinite(espnAthleteId) ? byEspnId.get(espnAthleteId) : undefined) ??
      byName.get(fullName.toLowerCase()) ??
      bySlug.get(slug);

    const playerData = {
      fullName,
      knownAs: slug,
      dateOfBirth: parseDateOfBirth(athlete.dateOfBirth) ?? new Date("2000-01-01T00:00:00.000Z"),
      nationality,
      position: parsePosition(athlete),
      height: inchesToCm(athlete.height) ?? 185,
      weight: lbsToKg(athlete.weight) ?? 90,
      photoUrl: athlete.headshot?.href ?? null,
      apiSportsId: Number.isFinite(espnAthleteId) ? espnAthleteId : null,
      sport: "AMERICAN_FOOTBALL" as const,
      league: leagueCode,
      teamId: options.teamId,
      dataSyncedSeason: footballSeasonLabel(currentYear),
      dataSyncedAt: new Date(),
    };

    let playerId = existingId;
    if (existingId) {
      await prisma.player.update({ where: { id: existingId }, data: playerData });
    } else {
      const created = await prisma.player.create({
        data: {
          ...playerData,
          strengths: [],
          weaknesses: [],
        },
        select: { id: true },
      });
      playerId = created.id;
      if (Number.isFinite(espnAthleteId)) byEspnId.set(espnAthleteId, created.id);
      byName.set(fullName.toLowerCase(), created.id);
      bySlug.set(slug, created.id);
    }

    await ensureAmericanFootballPlayerSeasons({
      playerId: playerId!,
      espnAthleteId: Number.isFinite(espnAthleteId) ? espnAthleteId : null,
      league: leagueCode,
      fetchPastStats: !skipStats,
    });

    return true;
  }

  while (cursor < athletes.length) {
    const batch = athletes.slice(cursor, cursor + CONCURRENCY);
    cursor += CONCURRENCY;
    const results = await Promise.all(batch.map((a) => upsertOne(a)));
    upserted += results.filter(Boolean).length;
  }

  void pastYear;
  return Math.max(existingCount, upserted);
}
