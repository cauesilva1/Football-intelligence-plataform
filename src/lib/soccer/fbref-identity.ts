import { normalizeNameForMatch } from "@/lib/sync/data-staleness";
import { fbrefIdentityRows, fbrefSquadNames } from "@/lib/soccer/fbref-index-data";

export interface FbrefIdentity {
  fullName: string;
  birthYear: number;
  /** Canonical primary position from the FBref Pos cell. */
  position: string;
  /** Squad with the most minutes in the light file — one row per player. */
  club: string;
  minutes: number;
}

let indexCache: {
  byKey: Map<string, FbrefIdentity>;
  byName: Map<string, FbrefIdentity[]>;
  squads: Set<string>;
} | null = null;

export function fbrefIdentityKey(fullName: string, birthYear: number): string {
  return `${normalizeNameForMatch(fullName)}::${birthYear}`;
}

function readIndex() {
  if (indexCache) return indexCache;

  const byKey = new Map<string, FbrefIdentity>();
  const byName = new Map<string, FbrefIdentity[]>();

  for (const [fullName, birthYear, position, club, minutes] of fbrefIdentityRows) {
    const identity: FbrefIdentity = { fullName, birthYear, position, club, minutes };
    const key = fbrefIdentityKey(fullName, birthYear);
    byKey.set(key, identity);
    const nameKey = normalizeNameForMatch(fullName);
    const list = byName.get(nameKey) ?? [];
    list.push(identity);
    byName.set(nameKey, list);
  }

  indexCache = { byKey, byName, squads: new Set(fbrefSquadNames) };
  return indexCache;
}

export function lookupFbrefIdentity(
  fullName: string,
  birthYear?: number | null
): FbrefIdentity | null {
  const index = readIndex();
  if (birthYear && birthYear !== 2000) {
    const exact = index.byKey.get(fbrefIdentityKey(fullName, birthYear));
    if (exact) return exact;
  }
  const matches = index.byName.get(normalizeNameForMatch(fullName)) ?? [];
  if (matches.length === 1) return matches[0];
  if (birthYear) return matches.find((item) => item.birthYear === birthYear) ?? null;
  return null;
}

export function big5SquadNames(): ReadonlySet<string> {
  return readIndex().squads;
}

export function dedupeSoccerIdentities<
  T extends {
    id: string;
    fullName: string;
    dateOfBirth: string;
    teamName?: string | null;
    currentSeasonStats?: { minutesPlayed: number };
  },
>(players: T[]): T[] {
  const groups = new Map<string, T[]>();

  for (const player of players) {
    const year = Number.isFinite(Date.parse(player.dateOfBirth))
      ? new Date(player.dateOfBirth).getUTCFullYear()
      : 0;
    const identity = lookupFbrefIdentity(player.fullName, year);
    const key = identity
      ? fbrefIdentityKey(identity.fullName, identity.birthYear)
      : fbrefIdentityKey(player.fullName, year || 0);
    const list = groups.get(key) ?? [];
    list.push(player);
    groups.set(key, list);
  }

  const picked: T[] = [];
  for (const group of groups.values()) {
    if (group.length === 1) {
      picked.push(group[0]);
      continue;
    }
    const sample = group[0];
    const year = new Date(sample.dateOfBirth).getUTCFullYear();
    const identity = lookupFbrefIdentity(sample.fullName, year);
    const preferred = identity ? normalizeNameForMatch(identity.club) : "";
    const matching = preferred
      ? group.filter((player) => normalizeNameForMatch(player.teamName ?? "") === preferred)
      : [];
    const pool = matching.length > 0 ? matching : group;
    pool.sort(
      (a, b) =>
        (b.currentSeasonStats?.minutesPlayed ?? 0) - (a.currentSeasonStats?.minutesPlayed ?? 0)
    );
    picked.push(pool[0]);
  }

  return picked;
}
