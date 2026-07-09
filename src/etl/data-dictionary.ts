// ==========================================================
// ETL Data Dictionary — CSV (FBref light) → domain / Prisma
// ==========================================================

import type { Prisma } from "@prisma/client";

/** Raw row shape produced by csv-parser (all values are strings). */
export type CsvPlayerRow = Record<string, string>;

export const DEFAULT_SEASON = "2025/26";

type StatisticField = keyof Pick<
  Prisma.PlayerStatisticCreateInput,
  | "appearances"
  | "minutesPlayed"
  | "goals"
  | "assists"
  | "xG"
  | "xA"
  | "shots"
  | "shotsOnTarget"
  | "passes"
  | "passAccuracy"
  | "keyPasses"
  | "dribblesCompleted"
  | "tacklesWon"
  | "interceptions"
  | "duelsWonPct"
  | "yellowCards"
  | "redCards"
  | "rating"
>;

type CsvColumnMapping = {
  csv: string;
  /** Optional secondary column when the primary is empty. */
  fallback?: string;
  kind: "int" | "float";
};

type CsvDefaultMapping = {
  default: number;
};

export type PlayerMappingEntry = CsvColumnMapping | CsvDefaultMapping;

export function isCsvColumnMapping(entry: PlayerMappingEntry): entry is CsvColumnMapping {
  return "csv" in entry;
}

/**
 * Maps `PlayerStatistic` fields to CSV columns.
 * Fields absent from the light dataset use explicit defaults (never invented stats).
 */
export const playerMapping: Record<StatisticField, PlayerMappingEntry> = {
  appearances: { csv: "MP", kind: "int" },
  minutesPlayed: { csv: "Min", kind: "int" },
  goals: { csv: "Gls", kind: "int" },
  assists: { csv: "Ast", kind: "int" },
  xG: { default: 0 },
  xA: { default: 0 },
  shots: { csv: "Sh", kind: "int" },
  shotsOnTarget: { csv: "SoT", kind: "int" },
  passes: { default: 0 },
  passAccuracy: { default: 0 },
  keyPasses: { csv: "Crs", kind: "float" },
  dribblesCompleted: { default: 0 },
  tacklesWon: { csv: "TklW", kind: "float" },
  interceptions: { csv: "Int", kind: "float" },
  duelsWonPct: { default: 0 },
  yellowCards: { csv: "CrdY", fallback: "CrdY_stats_misc", kind: "int" },
  redCards: { csv: "CrdR", fallback: "CrdR_stats_misc", kind: "int" },
  rating: { default: 0 },
};

/** Identity / context columns used alongside statistics. */
export const playerIdentityMapping = {
  fullName: "Player",
  nationality: "Nation",
  position: "Pos",
  squad: "Squad",
  competition: "Comp",
  age: "Age",
  birthYear: "Born",
  starts: "Starts",
  nineties: "90s",
} as const;

const POSITION_ALIASES: Record<string, string> = {
  GK: "GK",
  DF: "CB",
  MF: "CM",
  FW: "ST",
  CB: "CB",
  LB: "LB",
  RB: "RB",
  CDM: "CDM",
  CM: "CM",
  CAM: "CAM",
  LW: "LW",
  RW: "RW",
  ST: "ST",
};

/**
 * Normalizes FBref position strings (e.g. `"MF,FW"`) into primary + optional secondary codes.
 */
export function normalizePosition(raw: string): { primary: string; secondary?: string } {
  const tokens = raw
    .split(",")
    .map((part) => part.trim().toUpperCase())
    .filter(Boolean);

  if (tokens.length === 0) {
    return { primary: "CM" };
  }

  const mapped = tokens.map((token) => POSITION_ALIASES[token] ?? token);
  const [primary, secondary] = mapped;

  return secondary ? { primary, secondary } : { primary };
}

/**
 * Parses numeric CSV cells — handles empty strings, whitespace and comma decimals.
 */
export function cleanNumber(value: string | undefined | null, kind: "int" | "float" = "float"): number {
  if (value == null) return 0;

  const trimmed = value.trim();
  if (!trimmed || trimmed === "-" || trimmed.toLowerCase() === "na") return 0;

  const normalized = trimmed.replace(",", ".");
  const parsed = kind === "int" ? parseInt(normalized, 10) : parseFloat(normalized);

  return Number.isFinite(parsed) ? parsed : 0;
}

/** Strips flag prefix from nation cells (`"us USA"` → `"USA"`). */
export function cleanNation(value: string | undefined): string {
  if (!value?.trim()) return "UNK";
  const parts = value.trim().split(/\s+/);
  return parts[parts.length - 1]?.toUpperCase() ?? "UNK";
}

/** Reads a mapped statistic value from a raw CSV row. */
export function readMappedStatistic(
  row: CsvPlayerRow,
  field: StatisticField
): number {
  const mapping = playerMapping[field];

  if (!isCsvColumnMapping(mapping)) {
    return mapping.default;
  }

  const raw = row[mapping.csv]?.trim() ? row[mapping.csv] : row[mapping.fallback ?? ""];
  return cleanNumber(raw, mapping.kind);
}
