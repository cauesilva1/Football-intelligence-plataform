/**
 * Brasileirão 2025 — ingestão histórica a partir do CSV local no Supabase (Prisma).
 * Cria jogadores ausentes e persiste estatísticas da temporada 2025.
 *
 * Uso: npm run data:sync-br2025-db
 */
import fs from "fs";
import path from "path";
import csv from "csv-parser";
import { PrismaClient } from "@prisma/client";

const SEASON = 2025;
const LEAGUE_LABEL = "Série A";
const PROGRESS_EVERY = 25;
const CSV_PATH = path.join(process.cwd(), "data", "raw", "brasileirao_players_2025.csv");

function loadDotEnv(): void {
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;

  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadDotEnv();

function normalizeNameForMatch(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildPlayerSlug(name: string): string {
  const slug = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return slug || "jogador";
}

function inferPosition(
  goals: number,
  assists: number,
  tackles: number,
  interceptions: number
): string {
  const defenseScore = tackles + interceptions;
  const attackScore = goals * 2 + assists;

  if (defenseScore >= 25 && defenseScore > attackScore) return "CB";
  if (goals >= 6) return "ST";
  if (assists >= 5) return "AM";
  if (attackScore >= 8) return "FW";
  if (defenseScore >= 10) return "DM";
  return "CM";
}

interface CsvRow {
  Player: string;
  Gls: string;
  Ast: string;
  Tkl: string;
  Int: string;
  "Cmp%": string;
}

interface PlayerRef {
  id: string;
  fullName: string;
  knownAs: string;
}

function parseIntStat(value: string | undefined): number {
  const normalized = value?.trim().replace(/,/g, "") ?? "";
  if (!normalized || normalized === "-") return 0;
  const parsed = Number.parseInt(normalized, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseFloatStat(value: string | undefined): number {
  const normalized = value?.trim().replace(/,/g, "") ?? "";
  if (!normalized || normalized === "-") return 0;
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function readCsvRows(filePath: string): Promise<CsvRow[]> {
  return new Promise((resolve, reject) => {
    const rows: CsvRow[] = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (row: CsvRow) => rows.push(row))
      .on("end", () => resolve(rows))
      .on("error", reject);
  });
}

function indexPlayers(players: PlayerRef[]): {
  byNormalizedName: Map<string, PlayerRef>;
  bySlug: Map<string, PlayerRef>;
} {
  const byNormalizedName = new Map<string, PlayerRef>();
  const bySlug = new Map<string, PlayerRef>();

  for (const player of players) {
    byNormalizedName.set(normalizeNameForMatch(player.fullName), player);
    byNormalizedName.set(normalizeNameForMatch(player.knownAs), player);
    bySlug.set(player.knownAs, player);
    bySlug.set(buildPlayerSlug(player.fullName), player);
  }

  return { byNormalizedName, bySlug };
}

function lookupPlayer(
  indexes: { byNormalizedName: Map<string, PlayerRef>; bySlug: Map<string, PlayerRef> },
  playerName: string
): PlayerRef | null {
  const normalized = normalizeNameForMatch(playerName);
  const slug = buildPlayerSlug(playerName);

  return indexes.byNormalizedName.get(normalized) ?? indexes.bySlug.get(slug) ?? null;
}

async function preloadCsvPlayers(
  prisma: PrismaClient,
  csvNames: string[]
): Promise<PlayerRef[]> {
  const slugs = [...new Set(csvNames.map(buildPlayerSlug))];

  const [byName, bySlug] = await Promise.all([
    prisma.player.findMany({
      where: { fullName: { in: csvNames } },
      select: { id: true, fullName: true, knownAs: true },
    }),
    prisma.player.findMany({
      where: { knownAs: { in: slugs } },
      select: { id: true, fullName: true, knownAs: true },
    }),
  ]);

  const merged = new Map<string, PlayerRef>();
  for (const player of [...byName, ...bySlug]) {
    merged.set(player.id, player);
  }

  return [...merged.values()];
}

async function resolvePlayerId(
  prisma: PrismaClient,
  indexes: { byNormalizedName: Map<string, PlayerRef>; bySlug: Map<string, PlayerRef> },
  playerName: string,
  stats: { goals: number; assists: number; tackles: number; interceptions: number }
): Promise<{ id: string; created: boolean }> {
  const existing = lookupPlayer(indexes, playerName);
  if (existing) {
    return { id: existing.id, created: false };
  }

  const slug = buildPlayerSlug(playerName);
  const created = await prisma.player.create({
    data: {
      fullName: playerName,
      knownAs: slug,
      dateOfBirth: new Date(Date.UTC(2000, 0, 1)),
      nationality: "Brazil",
      position: inferPosition(stats.goals, stats.assists, stats.tackles, stats.interceptions),
      height: 180,
      weight: 75,
      strengths: [],
      weaknesses: [],
      dataSyncedSeason: String(SEASON),
      dataSyncedAt: new Date(),
    },
    select: { id: true, fullName: true, knownAs: true },
  });

  indexes.byNormalizedName.set(normalizeNameForMatch(created.fullName), created);
  indexes.bySlug.set(created.knownAs, created);

  return { id: created.id, created: true };
}

async function main(prisma: PrismaClient): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error("DATABASE_URL ausente. Configure .env antes de executar o sync.");
  }

  if (!fs.existsSync(CSV_PATH)) {
    throw new Error(`CSV não encontrado: ${CSV_PATH}`);
  }

  const csvRows = await readCsvRows(CSV_PATH);
  const csvNames = csvRows.map((row) => row.Player?.trim()).filter(Boolean) as string[];

  console.log(`[sync-br2025] CSV carregado: ${csvRows.length} jogadores (${LEAGUE_LABEL})`);

  const existingPlayers = await preloadCsvPlayers(prisma, csvNames);
  const indexes = indexPlayers(existingPlayers);

  console.log(
    `[sync-br2025] Índice: ${existingPlayers.length} jogadores do CSV já existentes no banco`
  );
  console.log(`[sync-br2025] Processando ${csvRows.length} linhas...`);

  let statsUpserted = 0;
  let playersCreated = 0;
  let failed = 0;
  let processed = 0;

  for (const row of csvRows) {
    const playerName = row.Player?.trim();
    if (!playerName) continue;

    processed += 1;

    try {
      const goals = parseIntStat(row.Gls);
      const assists = parseIntStat(row.Ast);
      const tackles = parseFloatStat(row.Tkl);
      const interceptions = parseFloatStat(row.Int);
      const passingAccuracy = 0;

      const { id: playerId, created } = await resolvePlayerId(prisma, indexes, playerName, {
        goals,
        assists,
        tackles,
        interceptions,
      });

      if (created) playersCreated += 1;

      await prisma.playerSeasonStats.upsert({
        where: {
          playerId_season: {
            playerId,
            season: SEASON,
          },
        },
        create: {
          playerId,
          season: SEASON,
          goals,
          assists,
          tackles,
          interceptions,
          passingAccuracy,
          minutesPlayed: 0,
          matchesPlayed: 0,
        },
        update: {
          goals,
          assists,
          tackles,
          interceptions,
          passingAccuracy,
        },
      });

      if (created) {
        await prisma.player.update({
          where: { id: playerId },
          data: {
            dataSyncedSeason: String(SEASON),
            dataSyncedAt: new Date(),
          },
        });
      }

      statsUpserted += 1;

      if (processed % PROGRESS_EVERY === 0 || processed === csvRows.length) {
        console.log(
          `[sync-br2025] Progresso: ${processed}/${csvRows.length} · stats: ${statsUpserted} · criados: ${playersCreated} · falhas: ${failed}`
        );
      }
    } catch (error) {
      failed += 1;
      console.warn(`[sync-br2025] FAIL ${playerName}:`, error);
    }
  }

  console.log(
    `[sync-br2025] Concluído — stats 2025: ${statsUpserted} · jogadores criados: ${playersCreated} · falhas: ${failed}`
  );
}

const prisma = new PrismaClient();

main(prisma)
  .catch((error: unknown) => {
    console.error("[sync-br2025] Erro fatal:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
