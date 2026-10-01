import fs from "fs";
import csv from "csv-parser";
import { getPrisma } from "@/lib/prisma";
import type { CsvPlayerRow } from "@/etl/data-dictionary";
import { resolveCsvPath } from "@/etl/paths";
import { transformCsvRow } from "@/etl/transform/transformer";
import {
  europeanCsvToSeasonStatsPayload,
  resolveSeasonYearFromLabel,
  upsertPlayerSeasonStats,
} from "@/lib/metrics/upsert-player-season-stats";
import { clubShortCode } from "@/lib/soccer/club-label";
import { fbrefIdentityKey } from "@/lib/soccer/fbref-identity";

const PROGRESS_INTERVAL = 100;

function parseCompetition(raw: string): { country: string; name: string } {
  const trimmed = raw.trim();
  const [code, ...rest] = trimmed.split(/\s+/);
  const countryByCode: Record<string, string> = {
    eng: "England",
    es: "Spain",
    de: "Germany",
    it: "Italy",
    fr: "France",
    pt: "Portugal",
    nl: "Netherlands",
    be: "Belgium",
    tr: "Turkey",
    us: "United States",
  };

  return {
    country: countryByCode[code?.toLowerCase() ?? ""] ?? code?.toUpperCase() ?? "Unknown",
    name: rest.join(" ") || trimmed,
  };
}

function teamShortName(name: string): string {
  return clubShortCode(name);
}

interface PlayerCacheEntry {
  id: string;
  minutes: number;
}

interface EntityCache {
  competitionIdByName: Map<string, string>;
  teamIdByName: Map<string, string>;
  playerByIdentity: Map<string, PlayerCacheEntry>;
}

async function getOrCreateCompetition(name: string, country: string, cache: EntityCache): Promise<string> {
  const cacheKey = `${country}::${name}`;
  const cached = cache.competitionIdByName.get(cacheKey);
  if (cached) return cached;

  const existing = await getPrisma().competition.findFirst({
    where: { name, country },
    select: { id: true },
  });

  if (existing) {
    cache.competitionIdByName.set(cacheKey, existing.id);
    return existing.id;
  }

  const created = await getPrisma().competition.create({
    data: { name, country },
    select: { id: true },
  });

  cache.competitionIdByName.set(cacheKey, created.id);
  return created.id;
}

async function getOrCreateTeam(
  teamName: string,
  competitionName: string,
  cache: EntityCache
): Promise<string> {
  const cached = cache.teamIdByName.get(teamName);
  if (cached) return cached;

  const existing = await getPrisma().team.findFirst({
    where: { name: teamName },
    select: { id: true },
  });

  if (existing) {
    cache.teamIdByName.set(teamName, existing.id);
    return existing.id;
  }

  const { country, name: compName } = parseCompetition(competitionName);
  const competitionId = await getOrCreateCompetition(compName, country, cache);

  const created = await getPrisma().team.create({
    data: {
      name: teamName,
      shortName: teamShortName(teamName),
      country,
      competitionId,
    },
    select: { id: true },
  });

  cache.teamIdByName.set(teamName, created.id);
  return created.id;
}

async function getOrCreatePlayer(
  record: ReturnType<typeof transformCsvRow>,
  teamId: string,
  cache: EntityCache
): Promise<string> {
  const dob =
    record.player.dateOfBirth instanceof Date
      ? record.player.dateOfBirth
      : new Date(record.player.dateOfBirth);
  const birthYear = dob.getUTCFullYear();
  const key = fbrefIdentityKey(record.player.fullName, birthYear);
  const minutes = record.statistic.minutesPlayed ?? 0;
  const cached = cache.playerByIdentity.get(key);

  const attachClub = async (playerId: string) => {
    await getPrisma().player.update({
      where: { id: playerId },
      data: {
        teamId,
        position: record.player.position,
        secondaryPosition: record.player.secondaryPosition,
        knownAs: record.player.knownAs,
      },
    });
  };

  if (cached) {
    if (minutes > cached.minutes) {
      await attachClub(cached.id);
      cached.minutes = minutes;
    }
    return cached.id;
  }

  const existing = await getPrisma().player.findFirst({
    where: {
      fullName: record.player.fullName,
      dateOfBirth: record.player.dateOfBirth,
      sport: "SOCCER",
    },
    select: { id: true },
  });

  if (existing) {
    await attachClub(existing.id);
    cache.playerByIdentity.set(key, { id: existing.id, minutes });
    return existing.id;
  }

  const created = await getPrisma().player.create({
    data: {
      fullName: record.player.fullName,
      knownAs: record.player.knownAs,
      dateOfBirth: record.player.dateOfBirth,
      nationality: record.player.nationality,
      position: record.player.position,
      secondaryPosition: record.player.secondaryPosition,
      height: record.player.height,
      weight: record.player.weight,
      preferredFoot: record.player.preferredFoot,
      marketValue: record.player.marketValue,
      strengths: record.player.strengths,
      weaknesses: record.player.weaknesses,
      teamId,
      sport: "SOCCER",
    },
    select: { id: true },
  });

  cache.playerByIdentity.set(key, { id: created.id, minutes });
  return created.id;
}

async function upsertStatisticForRecord(
  record: ReturnType<typeof transformCsvRow>,
  cache: EntityCache
): Promise<void> {
  const teamId = await getOrCreateTeam(record.player.teamName, record.player.competitionName, cache);
  const playerId = await getOrCreatePlayer(record, teamId, cache);
  const seasonYear = resolveSeasonYearFromLabel(record.season);
  const prisma = getPrisma();

  await upsertPlayerSeasonStats(
    prisma,
    playerId,
    seasonYear,
    europeanCsvToSeasonStatsPayload(record.statistic)
  );

  await prisma.player.update({
    where: { id: playerId },
    data: {
      dataSyncedSeason: String(seasonYear),
      dataSyncedAt: new Date(),
    },
  });
}

/**
 * Streams the full CSV, transforms each row and upserts into Postgres via Prisma.
 * Processes sequentially to avoid exhausting DB connections.
 */
export async function loadDataToDatabase(filePath?: string): Promise<number> {
  const csvPath = filePath ?? resolveCsvPath();
  const cache: EntityCache = {
    competitionIdByName: new Map(),
    teamIdByName: new Map(),
    playerByIdentity: new Map(),
  };

  let processed = 0;
  let pending = 0;
  let ended = false;

  await new Promise<void>((resolve, reject) => {
    const stream = fs.createReadStream(csvPath).pipe(csv());

    const maybeFinish = () => {
      if (ended && pending === 0) resolve();
    };

    stream.on("data", (row: CsvPlayerRow) => {
      stream.pause();
      pending += 1;

      void (async () => {
        try {
          const record = transformCsvRow(row);
          await upsertStatisticForRecord(record, cache);
          processed += 1;

          if (processed % PROGRESS_INTERVAL === 0) {
            console.log(`Processados: ${processed} registros...`);
          }
        } catch (error) {
          reject(error instanceof Error ? error : new Error(String(error)));
          stream.destroy();
          return;
        } finally {
          pending -= 1;
          if (!stream.destroyed) stream.resume();
          maybeFinish();
        }
      })();
    });

    stream.on("end", () => {
      ended = true;
      maybeFinish();
    });

    stream.on("error", reject);
  });

  return processed;
}

async function main(): Promise<void> {
  console.log("═".repeat(72));
  console.log("ETL — Carga completa no banco (LOAD)");
  console.log("═".repeat(72));

  const total = await loadDataToDatabase();

  console.log("─".repeat(72));
  console.log(`Carga finalizada! Total inserido/atualizado: ${total}`);
  console.log("═".repeat(72));
}

main()
  .catch((error: unknown) => {
    console.error("Falha na carga ETL:", error);
    process.exit(1);
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });
