export const SHORTLIST_STORAGE_KEY = "football-intel:shortlist";
export const SHORTLIST_CHANGED_EVENT = "football-intel:shortlist-changed";

export function scoutNoteStorageKey(playerId: string): string {
  return `football-intel:notes:${playerId}`;
}

export interface ScoutNoteRecord {
  text: string;
  updatedAt: string;
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
