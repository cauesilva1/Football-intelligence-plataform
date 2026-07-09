import fs from "fs";
import path from "path";
import { readAndTransformCsv } from "@/etl/extract/csv-reader";
import { DEFAULT_SEASON } from "@/etl/data-dictionary";
import { buildExternalKey, type TransformedRecord } from "@/etl/transform/transformer";
import { namesLikelyMatch, normalizeNameForMatch } from "@/lib/sync/data-staleness";

const CSV_CANDIDATES = [
  "players_data-2025_2026.csv",
  "players_data_light-2025_2026.csv",
];

let cachedIndex: TransformedRecord[] | null = null;
let cachedPath: string | null = null;

/** Resolves the FBref CSV path (full dataset preferred, light fallback). */
export function resolveFbrefCsvPath(): string | null {
  const rawDir = path.join(process.cwd(), "data", "raw");
  for (const filename of CSV_CANDIDATES) {
    const full = path.join(rawDir, filename);
    if (fs.existsSync(full)) return full;
  }
  return null;
}

async function loadFbrefIndex(): Promise<TransformedRecord[]> {
  const csvPath = resolveFbrefCsvPath();
  if (!csvPath) return [];

  if (cachedIndex && cachedPath === csvPath) return cachedIndex;

  cachedPath = csvPath;
  cachedIndex = await readAndTransformCsv({ filePath: csvPath });
  return cachedIndex;
}

function scoreNameMatch(
  record: TransformedRecord,
  fullName: string,
  knownAs: string,
  teamName?: string
): number {
  let score = 0;
  const player = record.source.player;

  if (namesLikelyMatch(player, fullName)) score += 4;
  if (namesLikelyMatch(player, knownAs)) score += 3;
  if (teamName && namesLikelyMatch(record.source.squad, teamName)) score += 2;

  const playerNorm = normalizeNameForMatch(player);
  const lastName = normalizeNameForMatch(knownAs || fullName).split(" ").pop();
  if (lastName && playerNorm.endsWith(lastName)) score += 1;

  return score;
}

/**
 * Finds FBref advanced stats for a player using fuzzy name + optional team match.
 */
export async function findFbrefPlayerRecord(
  fullName: string,
  knownAs: string,
  teamName?: string | null,
  competitionName?: string | null
): Promise<TransformedRecord | null> {
  const index = await loadFbrefIndex();
  if (!index.length) return null;

  let best: TransformedRecord | null = null;
  let bestScore = 0;

  for (const record of index) {
    if (competitionName && record.source.competition) {
      const compNorm = competitionName.toLowerCase();
      const recordComp = record.source.competition.toLowerCase();
      const sameRegion =
        (compNorm.includes("premier") && recordComp.includes("premier")) ||
        (compNorm.includes("la liga") && recordComp.includes("la liga")) ||
        (compNorm.includes("serie a") && recordComp.includes("serie a")) ||
        (compNorm.includes("bundesliga") && recordComp.includes("bundesliga")) ||
        (compNorm.includes("ligue") && recordComp.includes("ligue")) ||
        (compNorm.includes("brasileir") && recordComp.includes("bra"));
      if (!sameRegion && !recordComp.includes(compNorm.split(" ")[0] ?? "")) {
        continue;
      }
    }

    const score = scoreNameMatch(record, fullName, knownAs, teamName ?? undefined);
    if (score > bestScore) {
      bestScore = score;
      best = record;
    }
  }

  return bestScore >= 4 ? best : null;
}

/** Estimates a performance rating when FBref light CSV has no rating column. */
export function estimateRatingFromFbref(
  statistic: TransformedRecord["statistic"],
  minutesPlayed: number
): number {
  if (minutesPlayed <= 0) return 0;

  const goals90 = ((statistic.goals ?? 0) / minutesPlayed) * 90;
  const assists90 = ((statistic.assists ?? 0) / minutesPlayed) * 90;
  const tackles90 = ((statistic.tacklesWon ?? 0) / minutesPlayed) * 90;
  const interceptions90 = ((statistic.interceptions ?? 0) / minutesPlayed) * 90;
  const shots = statistic.shots ?? 0;
  const shotAccuracy =
    shots > 0 ? ((statistic.shotsOnTarget ?? 0) / shots) * 100 : 0;

  const raw =
    6.2 +
    goals90 * 1.35 +
    assists90 * 0.95 +
    tackles90 * 0.12 +
    interceptions90 * 0.12 +
    (shotAccuracy > 0 ? shotAccuracy / 100 : 0) * 0.35;

  return Math.min(9.8, Math.max(5.5, Number(raw.toFixed(2))));
}

export function buildFbrefExternalKey(
  fullName: string,
  squad: string,
  season = DEFAULT_SEASON
): string {
  return buildExternalKey(fullName, squad, season);
}

export { DEFAULT_SEASON };
