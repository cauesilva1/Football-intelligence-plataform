import {
  API_FOOTBALL_EUROPEAN_SEASON_YEAR,
  CURRENT_SEASON,
  isBrazilianLeague,
  isMlsLeague,
  TRANSFERMARKT_BRAZIL_SEASON_ID,
  TRANSFERMARKT_MLS_SEASON_ID,
} from "@/lib/seasons";
import { namesLikelyMatch, normalizeNameForMatch } from "@/lib/sync/data-staleness";

const TM_API_BASE =
  process.env.TRANSFERMARKT_API_URL?.trim() || "https://transfermarkt-api.fly.dev";

export interface TransfermarktClubProfile {
  id: string;
  name: string;
  officialName?: string;
  image?: string;
  stadiumName?: string;
  foundedOn?: string;
  currentMarketValue?: number;
}

export interface TransfermarktPlayerProfile {
  id: string;
  name: string;
  imageUrl?: string;
  height?: number;
  marketValue?: number;
  citizenship?: string[];
  position?: { main?: string };
  club?: { id?: string; name?: string };
}

export interface TransfermarktSquadPlayer {
  id: string;
  name: string;
  position?: string;
  marketValue?: number;
  height?: number;
  nationality?: string[];
  dateOfBirth?: string;
}

const CLUB_NAME_TO_TM_ID: Array<{ keys: string[]; id: number }> = [
  { keys: ["arsenal"], id: 11 },
  { keys: ["real madrid"], id: 418 },
  { keys: ["barcelona"], id: 131 },
  { keys: ["atletico madrid"], id: 13 },
  { keys: ["manchester united", "man united"], id: 985 },
  { keys: ["manchester city", "man city"], id: 281 },
  { keys: ["liverpool"], id: 31 },
  { keys: ["chelsea"], id: 631 },
  { keys: ["tottenham"], id: 148 },
  { keys: ["bayern"], id: 27 },
  { keys: ["borussia dortmund", "dortmund"], id: 16 },
  { keys: ["juventus"], id: 506 },
  { keys: ["ac milan", "milan"], id: 5 },
  { keys: ["inter"], id: 46 },
  { keys: ["napoli"], id: 6195 },
  { keys: ["roma"], id: 12 },
  { keys: ["paris saint", "psg"], id: 583 },
  { keys: ["marseille"], id: 244 },
  { keys: ["lyon"], id: 1041 },
  { keys: ["monaco"], id: 162 },
  { keys: ["flamengo"], id: 614 },
  { keys: ["palmeiras"], id: 1023 },
  { keys: ["corinthians"], id: 720 },
  { keys: ["sao paulo", "são paulo"], id: 1025 },
  { keys: ["fluminense"], id: 2462 },
  { keys: ["botafogo"], id: 537 },
  { keys: ["atletico mineiro", "atlético mineiro"], id: 330 },
  { keys: ["internacional"], id: 6600 },
  { keys: ["gremio", "grêmio"], id: 593 },
  { keys: ["santos"], id: 221 },
];

function resolveTransfermarktSeasonId(competitionName?: string | null): number {
  if (isBrazilianLeague(competitionName)) {
    return TRANSFERMARKT_BRAZIL_SEASON_ID;
  }
  if (isMlsLeague(competitionName)) {
    return TRANSFERMARKT_MLS_SEASON_ID;
  }
  return API_FOOTBALL_EUROPEAN_SEASON_YEAR;
}

/** Public Transfermarkt proxy (fly.dev) is often down — trip after a few failures. */
const TM_CIRCUIT_FAIL_THRESHOLD = 3;
const TM_CIRCUIT_COOLDOWN_MS = 15 * 60 * 1000;
let tmConsecutiveFailures = 0;
let tmCircuitOpenUntil = 0;

export function isTransfermarktAvailable(): boolean {
  return Date.now() >= tmCircuitOpenUntil;
}

function noteTmSuccess() {
  tmConsecutiveFailures = 0;
}

function noteTmFailure(path: string, detail: string) {
  tmConsecutiveFailures += 1;
  if (tmConsecutiveFailures >= TM_CIRCUIT_FAIL_THRESHOLD && Date.now() >= tmCircuitOpenUntil) {
    tmCircuitOpenUntil = Date.now() + TM_CIRCUIT_COOLDOWN_MS;
    console.warn(
      `[transfermarkt] Circuit open for ${TM_CIRCUIT_COOLDOWN_MS / 60_000}m after repeated failures (last: ${detail} on ${path})`
    );
  } else {
    console.warn(`[transfermarkt] ${detail} on ${path}`);
  }
}

async function tmFetch<T>(path: string): Promise<T | null> {
  if (!isTransfermarktAvailable()) {
    return null;
  }

  try {
    const response = await fetch(`${TM_API_BASE}${path}`, {
      headers: { "User-Agent": "football-intelligence-platform/1.0" },
      next: { revalidate: 0 },
    });

    if (!response.ok) {
      noteTmFailure(path, `HTTP ${response.status}`);
      return null;
    }

    noteTmSuccess();
    return (await response.json()) as T;
  } catch (error) {
    noteTmFailure(path, "Fetch failed");
    console.warn("[transfermarkt] Fetch failed:", path, error);
    return null;
  }
}

export function resolveTransfermarktClubId(
  teamName: string,
  storedId?: number | null
): number | null {
  if (storedId) return storedId;

  const normalized = normalizeNameForMatch(teamName);
  for (const club of CLUB_NAME_TO_TM_ID) {
    if (club.keys.some((key) => normalized.includes(key))) return club.id;
  }
  return null;
}

export function transfermarktCrestUrl(clubId: number): string {
  return `https://tmssl.akamaized.net/images/wappen/head/${clubId}.png`;
}

export function transfermarktPlayerPhotoUrl(playerId: number): string {
  return `https://img.a.transfermarkt.technology/portrait/header/${playerId}.jpg`;
}

export async function searchTransfermarktClub(clubName: string): Promise<number | null> {
  const query = encodeURIComponent(clubName.split(" ")[0] ?? clubName);
  const data = await tmFetch<{ results?: Array<{ id: string; name: string }> }>(
    `/clubs/search/${query}?page_number=1`
  );
  const match = data?.results?.find((row) => namesLikelyMatch(row.name, clubName));
  return match ? Number(match.id) : null;
}

export async function searchTransfermarktPlayer(
  playerName: string,
  clubName?: string
): Promise<number | null> {
  const query = encodeURIComponent(playerName.split(" ").pop() ?? playerName);
  const data = await tmFetch<{
    results?: Array<{ id: string; name: string; club?: { name?: string } }>;
  }>(`/players/search/${query}?page_number=1`);

  const candidates = data?.results ?? [];
  const match =
    candidates.find(
      (row) =>
        namesLikelyMatch(row.name, playerName) &&
        (!clubName || !row.club?.name || namesLikelyMatch(row.club.name, clubName))
    ) ?? candidates.find((row) => namesLikelyMatch(row.name, playerName));

  return match ? Number(match.id) : null;
}

export async function fetchClubProfile(clubId: number): Promise<TransfermarktClubProfile | null> {
  return tmFetch<TransfermarktClubProfile>(`/clubs/${clubId}/profile`);
}

export async function fetchPlayerProfile(
  playerId: number
): Promise<TransfermarktPlayerProfile | null> {
  return tmFetch<TransfermarktPlayerProfile>(`/players/${playerId}/profile`);
}

export async function fetchClubSquad(
  clubId: number,
  competitionName?: string | null
): Promise<TransfermarktSquadPlayer[]> {
  const primary = resolveTransfermarktSeasonId(competitionName);
  const seasonCandidates = [primary, primary - 1, primary - 2, 2024].filter(
    (year, index, arr) => year > 2000 && arr.indexOf(year) === index
  );

  for (const seasonId of seasonCandidates) {
    const data = await tmFetch<{ players?: TransfermarktSquadPlayer[] }>(
      `/clubs/${clubId}/players?season_id=${seasonId}`
    );
    if (data?.players?.length) return data.players;
  }

  return [];
}

/** Fetch and normalize club data for the active season (25/26 EU, 2025 BR histórico). */
export async function syncClub(
  clubId: number,
  competitionName?: string | null
): Promise<{
  profile: TransfermarktClubProfile | null;
  squad: TransfermarktSquadPlayer[];
}> {
  const [profile, squad] = await Promise.all([
    fetchClubProfile(clubId),
    fetchClubSquad(clubId, competitionName),
  ]);

  return { profile, squad };
}

/** Fetch player market value, photo and biographical data from Transfermarkt. */
export async function syncPlayer(playerId: number): Promise<TransfermarktPlayerProfile | null> {
  return fetchPlayerProfile(playerId);
}

export function parseFoundedYear(foundedOn?: string): number | undefined {
  if (!foundedOn) return undefined;
  const year = Number(foundedOn.slice(0, 4));
  return Number.isFinite(year) ? year : undefined;
}

export { CURRENT_SEASON, isBrazilianLeague, isMlsLeague, TRANSFERMARKT_BRAZIL_SEASON_ID };
