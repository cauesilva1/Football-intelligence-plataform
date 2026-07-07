import { getPrisma } from "@/lib/prisma";
import { canUseDatabase, readSystemCache, writeSystemCache } from "@/lib/system-cache";
import { isUsablePlayerPhotoUrl, resolvePlayerPhotoUrl } from "@/lib/player-media";
import { CURRENT_SEASON } from "@/lib/data/generators";
import { sanitizeApiSportsSearch } from "@/lib/crests/sanitize-search";
import { apiSportsTeamLogoUrl, resolveClubCrestUrlSync } from "@/lib/crests/club-crests";

const API_BASE = "https://v3.football.api-sports.io";
const DAILY_LIMIT = 100;
const API_TEAM_SEASON = 2025;
const API_PLAYER_SEASON = 2024;

type JsonRecord = Record<string, unknown>;

interface ApiEnvelope<T> {
  response: T;
  errors?: Record<string, string>;
}

interface ApiTeamSearchItem {
  team: { id: number; name: string; logo: string | null };
}

interface ApiTeamStatisticsItem {
  team: { id: number; logo: string | null };
  fixtures?: {
    played?: { total?: number };
    wins?: { total?: number };
    draws?: { total?: number };
    loses?: { total?: number };
  };
  goals?: {
    for?: { total?: { total?: number } };
    against?: { total?: { total?: number } };
  };
}

interface ApiPlayerSearchItem {
  player: {
    id: number;
    name: string;
    height: string | null;
    weight: string | null;
    photo: string | null;
  };
}

const LEAGUE_IDS: Array<{ match: (name: string) => boolean; id: number }> = [
  { match: (n) => n.includes("premier"), id: 39 },
  { match: (n) => n.includes("la liga") || (n.includes("liga") && !n.includes("bundesliga")), id: 140 },
  { match: (n) => n.includes("serie a"), id: 135 },
  { match: (n) => n.includes("bundesliga"), id: 78 },
  { match: (n) => n.includes("ligue 1") || n.includes("ligue"), id: 61 },
];

function getApiKey(): string | null {
  const key = process.env.APISPORTS_KEY?.trim();
  return key || null;
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

async function getQuotaCount(): Promise<number> {
  const key = `api-sports:quota:${todayKey()}`;
  const payload = await readSystemCache<{ count?: number }>(key);
  return payload?.count ?? 0;
}

async function incrementQuota(): Promise<boolean> {
  const date = todayKey();
  const key = `api-sports:quota:${date}`;
  const current = await getQuotaCount();
  if (current >= DAILY_LIMIT) return false;

  await writeSystemCache(key, { date, count: current + 1 });
  return true;
}

/** API-Football rejects `league` when `team` or `search` is already set. */
function sanitizeApiParams(params: Record<string, string | number>): Record<string, string | number> {
  const cleaned = { ...params };
  if (cleaned.team != null || cleaned.search != null) {
    delete cleaned.league;
  }
  return cleaned;
}

async function fetchApiSports<T>(endpoint: string, params: Record<string, string | number>): Promise<T | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  const allowed = await incrementQuota();
  if (!allowed) {
    console.warn("[api-sports] Limite diário de 100 requisições atingido.");
    return null;
  }

  const url = new URL(`${API_BASE}${endpoint}`);
  for (const [key, value] of Object.entries(sanitizeApiParams(params))) {
    url.searchParams.set(key, String(value));
  }

  const response = await fetch(url, {
    headers: { "x-apisports-key": apiKey },
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    console.warn(`[api-sports] HTTP ${response.status} em ${endpoint}`);
    return null;
  }

  const data = (await response.json()) as ApiEnvelope<T>;
  if (data.errors && Object.keys(data.errors).length > 0) {
    console.warn("[api-sports] Erro da API:", data.errors);
    return null;
  }

  return data.response;
}

export function resolveLeagueId(competitionName?: string | null): number | null {
  const normalized = competitionName?.toLowerCase().replace(/\b(eng|es|de|it|fr)\b/g, "").trim() ?? "";
  for (const league of LEAGUE_IDS) {
    if (league.match(normalized)) return league.id;
  }
  return null;
}

function parseHeightCm(raw: string | null | undefined): number {
  if (!raw) return 0;
  const match = raw.match(/(\d{2,3})/);
  return match ? Number(match[1]) : 0;
}

function parseWeightKg(raw: string | null | undefined): number {
  if (!raw) return 0;
  const match = raw.match(/(\d{2,3})/);
  return match ? Number(match[1]) : 0;
}

export { sanitizeApiSportsSearch } from "@/lib/crests/sanitize-search";

export function apiSportsPlayerPhotoUrl(playerId: number): string {
  return `https://media.api-sports.io/football/players/${playerId}.png`;
}

export function parseApiSportsPlayerId(photoUrl?: string | null): number | null {
  const match = photoUrl?.match(/players\/(\d+)\.png/i);
  return match ? Number(match[1]) : null;
}

function teamStatsNeedEnrichment(stats?: {
  wins: number;
  goalsFor: number;
  matchesPlayed: number;
} | null): boolean {
  if (!stats) return true;
  return stats.wins === 0 && stats.goalsFor === 0 && stats.matchesPlayed === 0;
}

function hasValidPersistedPhoto(photoUrl: string | null | undefined): boolean {
  return isUsablePlayerPhotoUrl(photoUrl);
}

function playerNeedsEnrichment(player: {
  height: number;
  weight: number;
  photoUrl: string | null;
  apiSportsId: number | null;
}): boolean {
  if (hasValidPersistedPhoto(player.photoUrl)) return false;

  return (
    player.height <= 0 ||
    player.weight <= 0 ||
    !player.photoUrl ||
    player.apiSportsId == null
  );
}

async function resolveApiTeamId(
  teamId: string,
  teamName: string,
  leagueId: number,
  cachedApiId?: number | null
): Promise<number | null> {
  if (cachedApiId) return cachedApiId;

  const cacheKey = `api-sports:team:${teamId}`;
  const cached = await readSystemCache<JsonRecord>(cacheKey);
  const cachedId = cached?.apiSportsId;
  if (typeof cachedId === "number") return cachedId;

  const results = await fetchApiSports<ApiTeamSearchItem[]>("/teams", {
    search: sanitizeApiSportsSearch(teamName),
  });
  const match = results?.[0]?.team;
  if (!match?.id) return null;

  const logoUrl = match.logo ?? resolveClubCrestUrlSync(teamName, null, match.id);
  const prisma = getPrisma();

  await prisma.$transaction([
    prisma.team.update({
      where: { id: teamId },
      data: {
        apiSportsId: match.id,
        crestUrl: logoUrl ?? undefined,
      },
    }),
  ]);

  await writeSystemCache(cacheKey, { apiSportsId: match.id, leagueId, logoUrl });

  return match.id;
}

/** Lazy-load team statistics and crest from API-Football when DB stats are empty. */
export async function enrichTeamIfNeeded(teamId: string): Promise<void> {
  if (!canUseDatabase() || !getApiKey()) return;

  const prisma = getPrisma();
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: {
      competition: true,
      statistics: { where: { season: CURRENT_SEASON } },
    },
  });
  if (!team) return;

  const currentStats = team.statistics[0];
  if (!teamStatsNeedEnrichment(currentStats)) return;

  const leagueId = resolveLeagueId(team.competition?.name);
  if (!leagueId) return;

  const apiTeamId = await resolveApiTeamId(team.id, team.name, leagueId, team.apiSportsId);
  if (!apiTeamId) return;

  const payload = await fetchApiSports<ApiTeamStatisticsItem[]>("/teams/statistics", {
    season: API_TEAM_SEASON,
    team: apiTeamId,
  });
  const stats = payload?.[0];
  if (!stats) return;

  const matchesPlayed = stats.fixtures?.played?.total ?? 0;
  const wins = stats.fixtures?.wins?.total ?? 0;
  const draws = stats.fixtures?.draws?.total ?? 0;
  const losses = stats.fixtures?.loses?.total ?? 0;
  const goalsFor = stats.goals?.for?.total?.total ?? 0;
  const goalsAgainst = stats.goals?.against?.total?.total ?? 0;
  const crestUrl = stats.team.logo ?? team.crestUrl ?? apiSportsTeamLogoUrl(apiTeamId);

  await prisma.$transaction([
    prisma.team.update({
      where: { id: teamId },
      data: {
        apiSportsId: apiTeamId,
        crestUrl: crestUrl ?? undefined,
      },
    }),
    prisma.teamStatistic.upsert({
      where: { teamId_season: { teamId, season: CURRENT_SEASON } },
      create: {
        teamId,
        season: CURRENT_SEASON,
        matchesPlayed,
        wins,
        draws,
        losses,
        goalsFor,
        goalsAgainst,
        xG: goalsFor,
        xGA: goalsAgainst,
        possessionPct: 0,
        passAccuracyPct: 0,
        pressuresPer90: 0,
        attackRating: Math.min(99, Math.round(goalsFor * 1.1)),
        defenseRating: Math.min(99, Math.max(0, 100 - goalsAgainst)),
      },
      update: {
        matchesPlayed,
        wins,
        draws,
        losses,
        goalsFor,
        goalsAgainst,
        xG: goalsFor,
        xGA: goalsAgainst,
        attackRating: Math.min(99, Math.round(goalsFor * 1.1)),
        defenseRating: Math.min(99, Math.max(0, 100 - goalsAgainst)),
      },
    }),
  ]);
}

/** Lazy-load player height, weight and photo from API-Football when missing. */
export async function enrichPlayerIfNeeded(playerId: string): Promise<void> {
  if (!canUseDatabase() || !getApiKey()) return;

  const prisma = getPrisma();
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    include: { team: { include: { competition: true } } },
  });
  if (!player) return;

  if (hasValidPersistedPhoto(player.photoUrl)) return;

  if (!playerNeedsEnrichment(player)) return;

  const leagueId = resolveLeagueId(player.team?.competition?.name);
  if (!leagueId || !player.team) return;

  let apiTeamId = player.team.apiSportsId;
  if (!apiTeamId) {
    apiTeamId = await resolveApiTeamId(player.team.id, player.team.name, leagueId, player.team.apiSportsId);
  }
  if (!apiTeamId) return;

  const searchName = sanitizeApiSportsSearch(
    player.knownAs.length >= 3 ? player.knownAs : player.fullName
  );
  if (searchName.length < 2) return;

  const results = await fetchApiSports<ApiPlayerSearchItem[]>("/players", {
    search: searchName,
    season: API_PLAYER_SEASON,
    team: apiTeamId,
  });

  let match = results?.find((item) =>
    item.player.name.toLowerCase().includes(searchName.toLowerCase())
  )?.player;

  if (!match && searchName !== sanitizeApiSportsSearch(player.fullName)) {
    const fallbackSearch = sanitizeApiSportsSearch(player.fullName);
    if (fallbackSearch.length >= 2) {
      const fallback = await fetchApiSports<ApiPlayerSearchItem[]>("/players", {
        search: fallbackSearch,
        season: API_PLAYER_SEASON,
        team: apiTeamId,
      });
      match = fallback?.[0]?.player;
    }
  }

  if (!match?.id) return;

  const height = parseHeightCm(match.height) || player.height;
  const weight = parseWeightKg(match.weight) || player.weight;
  const photoUrl = resolvePlayerPhotoUrl({
    externalPhoto: match.photo,
    apiSportsId: match.id,
  });

  await prisma.player.update({
    where: { id: playerId },
    data: {
      apiSportsId: match.id,
      height: height > 0 ? height : player.height,
      weight: weight > 0 ? weight : player.weight,
      photoUrl,
    },
  });
}

export async function getApiSportsQuotaStatus(): Promise<{ used: number; limit: number; date: string }> {
  return { used: await getQuotaCount(), limit: DAILY_LIMIT, date: todayKey() };
}

// ── World Cup 2026 fixtures (cached 15 min) ───────────────────────────────

const WC_2026_LEAGUE_ID = 1;
const WC_2026_SEASON = 2026;
const FIXTURES_CACHE_KEY = `api-sports:fixtures:league-${WC_2026_LEAGUE_ID}-season-${WC_2026_SEASON}`;
const FIXTURES_CACHE_TTL_MS = 15 * 60 * 1000;

interface ApiSportsFixtureItem {
  fixture: {
    id: number;
    date: string;
    status: { short: string; long: string; elapsed: number | null };
    venue?: { name?: string | null; city?: string | null };
  };
  league: { round?: string | null };
  teams: {
    home: { name: string };
    away: { name: string };
  };
  goals: { home: number | null; away: number | null };
}

interface FixturesCachePayload {
  expiresAt: string;
  cachedAt: string;
  fixtures: ApiSportsFixtureItem[];
}

export async function fetchWorldCup2026FixturesRaw(): Promise<ApiSportsFixtureItem[]> {
  const cached = await readSystemCache<FixturesCachePayload>(FIXTURES_CACHE_KEY);
  if (cached?.expiresAt && new Date(cached.expiresAt) > new Date() && Array.isArray(cached.fixtures)) {
    return cached.fixtures;
  }

  const response = await fetchApiSports<ApiSportsFixtureItem[]>("/fixtures", {
    league: WC_2026_LEAGUE_ID,
    season: WC_2026_SEASON,
  });

  const fixtures = response ?? [];
  const now = new Date();
  const payload: FixturesCachePayload = {
    cachedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + FIXTURES_CACHE_TTL_MS).toISOString(),
    fixtures,
  };

  await writeSystemCache(FIXTURES_CACHE_KEY, payload as object);

  return fixtures;
}
