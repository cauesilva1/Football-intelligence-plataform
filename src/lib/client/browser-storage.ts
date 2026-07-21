export const SHORTLIST_STORAGE_KEY = "football-intel:shortlist";
export const SHORTLIST_CHANGED_EVENT = "football-intel:shortlist-changed";

const FILTER_PREFS_PREFIX = "fip:filters:";
const HUB_SEASON_PREFIX = "fip:hub-season:";
const AF_ENRICHED_PREFIX = "fip:af-enriched:";

export function scoutNoteStorageKey(playerId: string): string {
  return `football-intel:notes:${playerId}`;
}

export type ShortlistTag = "priority" | "watch" | "reject";

export interface ShortlistEntry {
  playerId: string;
  tag: ShortlistTag;
  note: string;
  updatedAt: string;
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
    | "valueScore"
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

function readLegacyNoteRecord(playerId: string): ScoutNoteRecord | null {
  const note = readJson<ScoutNoteRecord | null>(scoutNoteStorageKey(playerId), null);
  if (!note || typeof note.text !== "string") return null;
  return note;
}

export function getShortlistEntries(): ShortlistEntry[] {
  const raw = readJson<unknown>(SHORTLIST_STORAGE_KEY, []);
  if (!Array.isArray(raw)) return [];

  // Legacy: string[] of player IDs
  if (raw.length > 0 && raw.every((item) => typeof item === "string")) {
    return (raw as string[])
      .filter((id) => id.length > 0)
      .map((playerId) => {
        const legacyNote = readLegacyNoteRecord(playerId);
        return {
          playerId,
          tag: "watch" as const,
          note: legacyNote?.text ?? "",
          updatedAt: legacyNote?.updatedAt ?? new Date(0).toISOString(),
        };
      });
  }

  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Partial<ShortlistEntry>;
      if (typeof row.playerId !== "string" || !row.playerId) return null;
      const tag: ShortlistTag =
        row.tag === "priority" || row.tag === "reject" || row.tag === "watch"
          ? row.tag
          : "watch";
      return {
        playerId: row.playerId,
        tag,
        note: typeof row.note === "string" ? row.note : "",
        updatedAt:
          typeof row.updatedAt === "string" ? row.updatedAt : new Date(0).toISOString(),
      } satisfies ShortlistEntry;
    })
    .filter((entry): entry is ShortlistEntry => entry != null);
}

export function setShortlistEntries(entries: ShortlistEntry[]): void {
  const byId = new Map<string, ShortlistEntry>();
  for (const entry of entries) {
    byId.set(entry.playerId, entry);
  }
  writeJson(SHORTLIST_STORAGE_KEY, [...byId.values()]);
  if (isBrowser()) {
    window.dispatchEvent(new CustomEvent(SHORTLIST_CHANGED_EVENT));
  }
}

export function getShortlistIds(): string[] {
  return getShortlistEntries().map((e) => e.playerId);
}

export function setShortlistIds(ids: string[]): void {
  const existing = new Map(getShortlistEntries().map((e) => [e.playerId, e]));
  const next = ids.map((playerId) => {
    const prev = existing.get(playerId);
    return (
      prev ?? {
        playerId,
        tag: "watch" as const,
        note: readLegacyNoteRecord(playerId)?.text ?? "",
        updatedAt: new Date().toISOString(),
      }
    );
  });
  setShortlistEntries(next);
}

export function isInShortlist(playerId: string): boolean {
  return getShortlistIds().includes(playerId);
}

export function getShortlistEntry(playerId: string): ShortlistEntry | null {
  return getShortlistEntries().find((e) => e.playerId === playerId) ?? null;
}

export function toggleShortlistId(playerId: string): boolean {
  const entries = getShortlistEntries();
  const exists = entries.some((e) => e.playerId === playerId);
  const next = exists
    ? entries.filter((e) => e.playerId !== playerId)
    : [
        ...entries,
        {
          playerId,
          tag: "watch" as const,
          note: readLegacyNoteRecord(playerId)?.text ?? "",
          updatedAt: new Date().toISOString(),
        },
      ];
  setShortlistEntries(next);
  return !exists;
}

export function removeFromShortlist(playerId: string): void {
  setShortlistEntries(getShortlistEntries().filter((e) => e.playerId !== playerId));
}

export function setShortlistTag(playerId: string, tag: ShortlistTag): void {
  const entries = getShortlistEntries();
  const idx = entries.findIndex((e) => e.playerId === playerId);
  if (idx < 0) {
    setShortlistEntries([
      ...entries,
      {
        playerId,
        tag,
        note: readLegacyNoteRecord(playerId)?.text ?? "",
        updatedAt: new Date().toISOString(),
      },
    ]);
    return;
  }
  const next = [...entries];
  next[idx] = { ...next[idx], tag, updatedAt: new Date().toISOString() };
  setShortlistEntries(next);
}

export function setShortlistNote(playerId: string, note: string): ShortlistEntry {
  const entries = getShortlistEntries();
  const idx = entries.findIndex((e) => e.playerId === playerId);
  const updatedAt = new Date().toISOString();
  const entry: ShortlistEntry = {
    playerId,
    tag: idx >= 0 ? entries[idx].tag : "watch",
    note,
    updatedAt,
  };
  if (idx < 0) {
    setShortlistEntries([...entries, entry]);
  } else {
    const next = [...entries];
    next[idx] = entry;
    setShortlistEntries(next);
  }
  writeJson(scoutNoteStorageKey(playerId), { text: note, updatedAt } satisfies ScoutNoteRecord);
  return entry;
}

export function getScoutNote(playerId: string): ScoutNoteRecord | null {
  const fromShortlist = getShortlistEntries().find((e) => e.playerId === playerId);
  if (fromShortlist && fromShortlist.note.length > 0) {
    return { text: fromShortlist.note, updatedAt: fromShortlist.updatedAt };
  }
  return readLegacyNoteRecord(playerId);
}

export function saveScoutNote(playerId: string, text: string): ScoutNoteRecord {
  if (isInShortlist(playerId)) {
    const entry = setShortlistNote(playerId, text);
    return { text: entry.note, updatedAt: entry.updatedAt };
  }
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
