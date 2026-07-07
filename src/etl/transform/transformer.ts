import type { Prisma } from "@prisma/client";
import {
  cleanNation,
  cleanNumber,
  DEFAULT_SEASON,
  normalizePosition,
  playerIdentityMapping,
  playerMapping,
  readMappedStatistic,
  type CsvPlayerRow,
} from "@/etl/data-dictionary";

/** Stable slug for deduplication before DB IDs exist. */
export function buildExternalKey(fullName: string, squad: string, season: string): string {
  const slug = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

  return `${slug(fullName)}::${slug(squad)}::${season.replace("/", "-")}`;
}

export function buildPlayerTeamKey(fullName: string, teamName: string): string {
  return buildExternalKey(fullName, teamName, "").replace(/::$/, "");
}

export type TransformedPlayerStatistic = Omit<
  Prisma.PlayerStatisticCreateInput,
  "player" | "team" | "id" | "createdAt" | "externalKey"
>;

export type TransformedPlayer = Omit<
  Prisma.PlayerCreateInput,
  "statistics" | "reports" | "team" | "id" | "createdAt" | "updatedAt"
> & {
  /** Resolved later during load — references `Team.name` from CSV `Squad`. */
  teamName: string;
  competitionName: string;
};

export interface TransformedRecord {
  externalKey: string;
  season: string;
  player: TransformedPlayer;
  statistic: TransformedPlayerStatistic;
  /** Raw CSV snapshot for debugging / validation. */
  source: {
    player: string;
    squad: string;
    competition: string;
    position: string;
  };
}

function dateOfBirthFromBirthYear(birthYear: number): Date {
  const year = birthYear >= 1950 && birthYear <= 2015 ? birthYear : 2000;
  return new Date(Date.UTC(year, 0, 1));
}

/**
 * Transforms one raw CSV row into Prisma-ready player + statistic payloads.
 * Does not invent metrics — missing light-dataset fields stay at mapped defaults.
 */
export function transformCsvRow(row: CsvPlayerRow, season = DEFAULT_SEASON): TransformedRecord {
  const fullName = row[playerIdentityMapping.fullName]?.trim() ?? "Unknown";
  const squad = row[playerIdentityMapping.squad]?.trim() ?? "Unknown";
  const competition = row[playerIdentityMapping.competition]?.trim() ?? "Unknown";
  const rawPosition = row[playerIdentityMapping.position]?.trim() ?? "";
  const { primary, secondary } = normalizePosition(rawPosition);

  const birthYear = cleanNumber(row[playerIdentityMapping.birthYear], "int");
  const knownAs = fullName.split(" ").pop() ?? fullName;

  const statistic: TransformedPlayerStatistic = {
    season,
    appearances: readMappedStatistic(row, "appearances"),
    minutesPlayed: readMappedStatistic(row, "minutesPlayed"),
    goals: readMappedStatistic(row, "goals"),
    assists: readMappedStatistic(row, "assists"),
    xG: readMappedStatistic(row, "xG"),
    xA: readMappedStatistic(row, "xA"),
    shots: readMappedStatistic(row, "shots"),
    shotsOnTarget: readMappedStatistic(row, "shotsOnTarget"),
    passes: readMappedStatistic(row, "passes"),
    passAccuracy: readMappedStatistic(row, "passAccuracy"),
    keyPasses: readMappedStatistic(row, "keyPasses"),
    dribblesCompleted: readMappedStatistic(row, "dribblesCompleted"),
    tacklesWon: readMappedStatistic(row, "tacklesWon"),
    interceptions: readMappedStatistic(row, "interceptions"),
    duelsWonPct: readMappedStatistic(row, "duelsWonPct"),
    yellowCards: readMappedStatistic(row, "yellowCards"),
    redCards: readMappedStatistic(row, "redCards"),
    rating: readMappedStatistic(row, "rating"),
  };

  const player: TransformedPlayer = {
    fullName,
    knownAs,
    nationality: cleanNation(row[playerIdentityMapping.nationality]),
    position: primary,
    secondaryPosition: secondary,
    dateOfBirth: dateOfBirthFromBirthYear(birthYear),
    height: 0,
    weight: 0,
    preferredFoot: "RIGHT",
    marketValue: 0,
    strengths: [],
    weaknesses: [],
    teamName: squad,
    competitionName: competition,
  };

  return {
    externalKey: buildExternalKey(fullName, squad, season),
    season,
    player,
    statistic,
    source: {
      player: fullName,
      squad,
      competition,
      position: rawPosition,
    },
  };
}

/** Exposes mapping metadata for console validation output. */
export function getMappingSummary(): Record<string, string | number> {
  return Object.fromEntries(
    Object.entries(playerMapping).map(([field, entry]) => [
      field,
      "csv" in entry ? entry.csv + (entry.fallback ? ` (fallback: ${entry.fallback})` : "") : `default: ${entry.default}`,
    ])
  );
}
