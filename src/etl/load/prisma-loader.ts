import fs from "fs";
import csv from "csv-parser";
import { prisma } from "@/lib/prisma";
import type { CsvPlayerRow } from "@/etl/data-dictionary";
import { resolveCsvPath } from "@/etl/paths";
import { buildPlayerTeamKey, transformCsvRow } from "@/etl/transform/transformer";

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
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return words
    .map((word) => word[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
}

function playerCacheKey(fullName: string, teamName: string): string {
  return buildPlayerTeamKey(fullName, teamName);
}

interface EntityCache {
  competitionIdByName: Map<string, string>;
  teamIdByName: Map<string, string>;
  playerIdByKey: Map<string, string>;
}

async function getOrCreateCompetition(name: string, country: string, cache: EntityCache): Promise<string> {
  const cacheKey = `${country}::${name}`;
  const cached = cache.competitionIdByName.get(cacheKey);
  if (cached) return cached;

  const existing = await prisma.competition.findFirst({
    where: { name, country },
    select: { id: true },
  });

  if (existing) {
    cache.competitionIdByName.set(cacheKey, existing.id);
    return existing.id;
  }

  const created = await prisma.competition.create({
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

  const existing = await prisma.team.findFirst({
    where: { name: teamName },
    select: { id: true },
  });

  if (existing) {
    cache.teamIdByName.set(teamName, existing.id);
    return existing.id;
  }

  const { country, name: compName } = parseCompetition(competitionName);
  const competitionId = await getOrCreateCompetition(compName, country, cache);

  const created = await prisma.team.create({
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
  const key = playerCacheKey(record.player.fullName, record.player.teamName);
  const cached = cache.playerIdByKey.get(key);
  if (cached) return cached;

  const existing = await prisma.player.findFirst({
    where: {
      fullName: record.player.fullName,
      teamId,
    },
    select: { id: true },
  });

  if (existing) {
    cache.playerIdByKey.set(key, existing.id);
    return existing.id;
  }

  const created = await prisma.player.create({
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
    },
    select: { id: true },
  });

  cache.playerIdByKey.set(key, created.id);
  return created.id;
}

async function upsertStatisticForRecord(
  record: ReturnType<typeof transformCsvRow>,
  cache: EntityCache
): Promise<void> {
  const teamId = await getOrCreateTeam(record.player.teamName, record.player.competitionName, cache);
  const playerId = await getOrCreatePlayer(record, teamId, cache);

  await prisma.playerStatistic.upsert({
    where: { externalKey: record.externalKey },
    create: {
      externalKey: record.externalKey,
      playerId,
      teamId,
      ...record.statistic,
    },
    update: {
      playerId,
      teamId,
      ...record.statistic,
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
    playerIdByKey: new Map(),
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
    await prisma.$disconnect();
  });
