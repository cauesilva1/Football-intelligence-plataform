export const SHORTLIST_STORAGE_KEY = "football-intel:shortlist";
export const SHORTLIST_CHANGED_EVENT = "football-intel:shortlist-changed";

const FILTER_PREFS_PREFIX = "fip:filters:";
const HUB_SEASON_PREFIX = "fip:hub-season:";
const AF_ENRICHED_PREFIX = "fip:af-enriched:";

export function scoutNoteStorageKey(playerId: string): string {
  return `football-intel:notes:${playerId}`;
}

export interface ScoutNoteRecord {
  text: string;
  updatedAt: string;
}

/** Persisted scouting/player list prefs — URL remains source of truth when present. */
export interface StoredPlayerFilterPrefs {
  search?: string;
  position?: string;
  league?: string;
  teamId?: string;
  minAge?: number;
  maxAge?: number;
  minRating?: number;
  minMinutes?: number;
  minGoalsPer90?: number;
  minXGPer90?: number;
  maxMarketValue?: number;
  maxCapHit?: number;
  minPoints?: number;
  minRebounds?: number;
  minAssists?: number;
  minThreePointsPercent?: number;
  minSteals?: number;
  minBlocks?: number;
  archetype?: "three-and-d" | "rim-protector";
  sortBy?:
    | "rating"
    | "goals"
    | "assists"
    | "assistsPer90"
    | "goalsPer90"
    | "xGPer90"
    | "points"
    | "rebounds"
    | "age"
    | "marketValue"
    | "name"
    | "position"
    | "club";
  sortDir?: "asc" | "desc";
  pageSize?: number;
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function readJson<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function readSessionFlag(key: string): boolean {
  if (!isBrowser()) return false;
  try {
    return window.sessionStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function writeSessionFlag(key: string): void {
  if (!isBrowser()) return;
  try {
    window.sessionStorage.setItem(key, "1");
  } catch {
    /* private mode / quota */
  }
}

export function getShortlistIds(): string[] {
  const ids = readJson<string[]>(SHORTLIST_STORAGE_KEY, []);
  return Array.isArray(ids) ? ids.filter((id) => typeof id === "string") : [];
}

export function setShortlistIds(ids: string[]): void {
  const unique = [...new Set(ids)];
  writeJson(SHORTLIST_STORAGE_KEY, unique);
  if (isBrowser()) {
    window.dispatchEvent(new CustomEvent(SHORTLIST_CHANGED_EVENT));
  }
}

export function isInShortlist(playerId: string): boolean {
  return getShortlistIds().includes(playerId);
}

export function toggleShortlistId(playerId: string): boolean {
  const ids = getShortlistIds();
  const exists = ids.includes(playerId);
  const next = exists ? ids.filter((id) => id !== playerId) : [...ids, playerId];
  setShortlistIds(next);
  return !exists;
}

export function removeFromShortlist(playerId: string): void {
  setShortlistIds(getShortlistIds().filter((id) => id !== playerId));
}

export function getScoutNote(playerId: string): ScoutNoteRecord | null {
  const note = readJson<ScoutNoteRecord | null>(scoutNoteStorageKey(playerId), null);
  if (!note || typeof note.text !== "string") return null;
  return note;
}

export function saveScoutNote(playerId: string, text: string): ScoutNoteRecord {
  const note: ScoutNoteRecord = { text, updatedAt: new Date().toISOString() };
  writeJson(scoutNoteStorageKey(playerId), note);
  return note;
}

function filterPrefsKey(sport: string, route: string): string {
  return `${FILTER_PREFS_PREFIX}${sport}:${route}`;
}

export function getPlayerFilterPrefs(
  sport: string,
  route: string
): StoredPlayerFilterPrefs | null {
  const prefs = readJson<StoredPlayerFilterPrefs | null>(filterPrefsKey(sport, route), null);
  if (!prefs || typeof prefs !== "object") return null;
  return prefs;
}

export function savePlayerFilterPrefs(
  sport: string,
  route: string,
  prefs: StoredPlayerFilterPrefs
): void {
  writeJson(filterPrefsKey(sport, route), prefs);
}

export function clearPlayerFilterPrefs(sport: string, route: string): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(filterPrefsKey(sport, route));
}

export function getHubSeasonPref(slug: string): number | null {
  const raw = readJson<number | string | null>(`${HUB_SEASON_PREFIX}${slug}`, null);
  if (raw == null) return null;
  const year = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(year) ? year : null;
}

export function saveHubSeasonPref(slug: string, seasonYear: number): void {
  writeJson(`${HUB_SEASON_PREFIX}${slug}`, seasonYear);
}

export function hasAfSeasonEnrichInSession(playerId: string): boolean {
  return readSessionFlag(`${AF_ENRICHED_PREFIX}${playerId}`);
}

export function markAfSeasonEnrichInSession(playerId: string): void {
  writeSessionFlag(`${AF_ENRICHED_PREFIX}${playerId}`);
}
