/**
 * EuroLeague official API client helpers — types aligned to api-live.euroleague.net/v2.
 */
const API_BASE = "https://api-live.euroleague.net/v2";
export const EUROLEAGUE_COMPETITION = "E";
/** Campaign 2025-26 season code on EuroLeague API. */
export const EUROLEAGUE_SEASON_CODE = "E2025";
/** Persisted PlayerSeasonStats / PlayerMatchStat season key. */
export const EUROLEAGUE_SEASON_YEAR = 202526;
export const EUROLEAGUE_LABEL = "EuroLeague";
/** Sentinel espnSlug so Competition rows resolve without an ESPN path. */
export const EUROLEAGUE_ESPN_SLUG = "euroleague";

async function fetchJson<T>(path: string): Promise<T> {
  const url = `${API_BASE}${path}`;
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "football-intelligence-platform/1.0 (euroleague)",
    },
    signal: AbortSignal.timeout(25_000),
  });
  if (!response.ok) {
    throw new Error(`EuroLeague API HTTP ${response.status} — ${path}`);
  }
  return (await response.json()) as T;
}

export type EuroLeagueClub = {
  code: string;
  name: string;
  abbreviatedName?: string;
  images?: { crest?: string };
  country?: { code?: string; name?: string };
};

export type EuroLeaguePersonRow = {
  person: {
    code: string;
    name: string;
    passportName?: string;
    passportSurname?: string;
    birthDate?: string;
    height?: number;
    weight?: number;
    country?: { name?: string };
    images?: { headshot?: string };
  };
  type?: string;
  typeName?: string;
  active?: boolean;
  positionName?: string;
  dorsal?: string;
  club?: { code?: string; name?: string; images?: { crest?: string } };
  images?: { headshot?: string };
};

export type EuroLeagueGameSide = {
  club?: { code?: string; name?: string; abbreviatedName?: string; images?: { crest?: string } };
  score?: number;
};

export type EuroLeagueGame = {
  gameCode: number;
  identifier?: string;
  date?: string;
  utcDate?: string;
  played?: boolean;
  local?: EuroLeagueGameSide;
  /** Away side — EuroLeague uses `road`, not `away`. */
  road?: EuroLeagueGameSide;
};

export type EuroLeaguePlayerLine = {
  player?: {
    person?: { code?: string; name?: string };
    typeName?: string;
  };
  stats?: {
    timePlayed?: number;
    points?: number;
    totalRebounds?: number;
    assistances?: number;
    steals?: number;
    blocksFavour?: number;
    fieldGoalsMade2?: number;
    fieldGoalsAttempted2?: number;
    fieldGoalsMade3?: number;
    fieldGoalsAttempted3?: number;
    fieldGoalsMadeTotal?: number;
    fieldGoalsAttemptedTotal?: number;
    startFive?: boolean;
  };
};

export async function fetchEuroLeagueClubs(
  seasonCode = EUROLEAGUE_SEASON_CODE
): Promise<EuroLeagueClub[]> {
  const payload = await fetchJson<{ data?: EuroLeagueClub[] }>(
    `/competitions/${EUROLEAGUE_COMPETITION}/seasons/${seasonCode}/clubs`
  );
  return payload.data ?? [];
}

export async function fetchEuroLeaguePeople(
  seasonCode = EUROLEAGUE_SEASON_CODE
): Promise<EuroLeaguePersonRow[]> {
  const payload = await fetchJson<{ data?: EuroLeaguePersonRow[] }>(
    `/competitions/${EUROLEAGUE_COMPETITION}/seasons/${seasonCode}/people`
  );
  return (payload.data ?? []).filter((row) => {
    const typeName = (row.typeName ?? "").toLowerCase();
    const type = (row.type ?? "").toUpperCase();
    return type === "J" || typeName === "player";
  });
}

export async function fetchEuroLeagueGames(
  seasonCode = EUROLEAGUE_SEASON_CODE
): Promise<EuroLeagueGame[]> {
  const payload = await fetchJson<{ data?: EuroLeagueGame[] }>(
    `/competitions/${EUROLEAGUE_COMPETITION}/seasons/${seasonCode}/games`
  );
  return payload.data ?? [];
}

export async function fetchEuroLeagueGameStats(
  gameCode: number,
  seasonCode = EUROLEAGUE_SEASON_CODE
): Promise<{
  local?: { players?: EuroLeaguePlayerLine[] };
  road?: { players?: EuroLeaguePlayerLine[] };
}> {
  return fetchJson(
    `/competitions/${EUROLEAGUE_COMPETITION}/seasons/${seasonCode}/games/${gameCode}/stats`
  );
}

export function formatEuroLeaguePlayerName(raw: string): { fullName: string; knownAs: string } {
  if (raw.includes(",")) {
    const [last, first] = raw.split(",").map((p) => p.trim());
    const fullName = `${titleCase(first)} ${titleCase(last)}`.trim();
    return { fullName, knownAs: fullName };
  }
  const fullName = titleCase(raw);
  return { fullName, knownAs: fullName };
}

function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function mapEuroLeaguePosition(positionName?: string): string {
  const n = (positionName ?? "").toLowerCase();
  if (n.includes("guard")) return "PG";
  if (n.includes("center")) return "C";
  if (n.includes("forward")) return "SF";
  return "SF";
}

export function euroLeaguePersonApiId(code: string): number {
  const n = Number.parseInt(code.replace(/\D/g, ""), 10);
  return Number.isFinite(n) ? 90_000_000 + n : 90_000_000;
}

/** Stable int id for club codes (avoids ESPN / API-Sports collisions). */
export function euroLeagueClubApiId(code: string): number {
  let hash = 0;
  for (let i = 0; i < code.length; i += 1) {
    hash = (hash * 31 + code.charCodeAt(i)) >>> 0;
  }
  return 91_000_000 + (hash % 1_000_000);
}

export function buildEuroLeagueEventKey(seasonCode: string, gameCode: number): string {
  return `euroleague:${seasonCode}:${gameCode}`;
}

/** Seconds → rounded minutes. */
export function euroLeagueMinutes(timePlayed?: number): number {
  if (!timePlayed || timePlayed <= 0) return 0;
  return Math.round(timePlayed / 60);
}
