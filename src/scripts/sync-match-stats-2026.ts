/**
 * Gatilho local para processar box score ESPN do Brasileirão 2026.
 *
 * Uso:
 *   npm run data:sync-match-2026 -- 732613
 *   npm run data:sync-match-2026 -- 732613 --force
 */
import fs from "fs";
import path from "path";
import { processMatchBoxScore2026 } from "@/lib/api/espn-boxscore";
import { getPrisma } from "@/lib/prisma";

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
  const args = process.argv.slice(2).filter((arg) => arg !== "--");
  const matchId = args.find((arg) => !arg.startsWith("--"));
  const force = args.includes("--force");

  if (!matchId?.trim()) {
    throw new Error(
      "Informe o ID da partida ESPN. Exemplo: npm run data:sync-match-2026 -- 732613"
    );
  }

  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error("DATABASE_URL ausente. Configure .env antes de executar o sync.");
  }

  console.log(`[sync-match-2026] Processando partida ESPN ${matchId}${force ? " (force)" : ""}...`);

  const result = await processMatchBoxScore2026(matchId.trim(), { force });

  if (result.alreadyProcessed) {
    console.log(
      `[sync-match-2026] Partida ${matchId} já processada anteriormente. Use --force para reprocessar.`
    );
    return;
  }

  console.log(
    `[sync-match-2026] Concluído — atletas: ${result.playersProcessed} · criados: ${result.playersCreated} · stats 2026: ${result.statsUpserted} · falhas: ${result.failed}`
  );
}

main()
  .catch((error: unknown) => {
    console.error("[sync-match-2026] Erro fatal:", error);
    process.exit(1);
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });
