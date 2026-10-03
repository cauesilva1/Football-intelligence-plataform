/**
 * NBA — cadastro de 30 franquias + elencos ativos via ESPN API.
 * Prepara PlayerSeasonStats base para a temporada vigente (resolvida pela data).
 *
 * Uso: npm run data:sync-nba-elencos
 */
import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { syncNbaRosters } from "@/lib/sync/nba-roster-sync";

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

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error("DATABASE_URL ausente. Configure .env antes de executar o sync.");
  }

  const prisma = new PrismaClient();

  try {
    console.log("[NBA-SYNC] Iniciando cadastro de franquias e elencos NBA...");
    const result = await syncNbaRosters({ prisma, force: true });
    console.log(
      `[NBA-SYNC] Concluído — temporada ${result.season} · franquias: ${result.franchisesSynced}/${result.franchisesTotal} · jogadores: ${result.players} · criados: ${result.playersCreated} · falhas: ${result.failed}`
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error("[NBA-SYNC] Erro fatal:", error);
  process.exit(1);
});
