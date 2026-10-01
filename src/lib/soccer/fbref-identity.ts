import { readFileSync } from "fs";
import path from "path";
import { normalizePosition } from "@/etl/data-dictionary";
import { normalizeNameForMatch } from "@/lib/sync/data-staleness";

export interface FbrefIdentity {
  fullName: string;
  birthYear: number;
  /** Canonical primary position from the FBref Pos cell. */
  position: string;
  /** Squad with the most minutes in the light file — one row per player. */
  club: string;
  minutes: number;
}

const CSV_PATH = path.join(process.cwd(), "data/raw/players_data_light-2025_2026.csv");

let indexCache: {
  byKey: Map<string, FbrefIdentity>;
  byName: Map<string, FbrefIdentity[]>;
  squads: Set<string>;
} | null = null;

function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let cell = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i += 1;
      row.push(cell);
      cell = "";
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
    } else {
      cell += char;
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    if (row.some((value) => value.length > 0)) rows.push(row);
  }

  const [header, ...body] = rows;
  if (!header) return [];
  return body.map((values) => {
    const record: Record<string, string> = {};
    header.forEach((column, index) => {
      record[column] = values[index] ?? "";
    });
    return record;
  });
}

export function fbrefIdentityKey(fullName: string, birthYear: number): string {
  return `${normalizeNameForMatch(fullName)}::${birthYear}`;
}

function readIndex() {
  if (indexCache) return indexCache;

  const byKey = new Map<string, FbrefIdentity>();
  const byName = new Map<string, FbrefIdentity[]>();
  const squads = new Set<string>();

  let text = "";
  try {
    text = readFileSync(CSV_PATH, "utf8");
  } catch {
    indexCache = { byKey, byName, squads };
    return indexCache;
  }

  for (const row of parseCsv(text)) {
    const fullName = row.Player?.trim();
    const squad = row.Squad?.trim();
    if (!fullName || !squad) continue;

    const birthYear = Number.parseInt(row.Born ?? "", 10);
    const minutes = Number.parseInt(row.Min ?? "", 10);
    const safeMinutes = Number.isFinite(minutes) ? minutes : 0;
    const { primary } = normalizePosition(row.Pos ?? "");
    const nameKey = normalizeNameForMatch(fullName);
    squads.add(normalizeNameForMatch(squad));

    if (!Number.isFinite(birthYear)) continue;
    const key = fbrefIdentityKey(fullName, birthYear);
    const existing = byKey.get(key);
    if (!existing || safeMinutes > existing.minutes) {
      const identity: FbrefIdentity = {
        fullName,
        birthYear,
        position: primary,
        club: squad,
        minutes: safeMinutes,
      };
      byKey.set(key, identity);
      const list = byName.get(nameKey) ?? [];
      const without = list.filter((item) => item.birthYear !== birthYear);
      without.push(identity);
      byName.set(nameKey, without);
    }
  }

  indexCache = { byKey, byName, squads };
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
