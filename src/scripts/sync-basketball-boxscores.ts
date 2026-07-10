/**
 * Engine de box score NBA — varre jogos finalizados do dia e acumula stats na temporada 202627.
 *
 * Uso:
 *   npm run data:sync-boxscore-basquete
 *   npm run data:sync-boxscore-basquete -- --event=401859967
 *   npm run data:sync-boxscore-basquete -- --force
 */
import fs from "fs";
import path from "path";
import {
  NBA_BOXSCORE_SEASON,
  processBasketballBoxScore,
  syncTodaysBasketballBoxScores,
} from "@/lib/api/espn-basketball-boxscore";

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

function parseArgs(): { eventId?: string; force: boolean } {
  const eventArg = process.argv.find((arg) => arg.startsWith("--event="));
  const force = process.argv.includes("--force");

  return {
    eventId: eventArg?.split("=")[1],
    force,
  };
}

async function main(): Promise<void> {
  const { eventId, force } = parseArgs();

  console.log(`[sync-boxscore-basquete] Temporada alvo: ${NBA_BOXSCORE_SEASON}`);

  if (eventId) {
    console.log(`[sync-boxscore-basquete] Processando evento ESPN ${eventId}${force ? " (force)" : ""}...`);
    const result = await processBasketballBoxScore(eventId, { force });

    if (result.alreadyProcessed) {
      console.log(`[sync-boxscore-basquete] Evento ${eventId} já processado (use --force para reprocessar).`);
      return;
    }

    console.log(
      `[sync-boxscore-basquete] OK — ${result.statsUpdated} stats atualizadas, ${result.skipped} ignorados, ${result.failed} falhas (${result.playersProcessed} atletas no box score).`
    );
    return;
  }

  console.log(`[sync-boxscore-basquete] Buscando jogos finalizados do dia...`);
  const summary = await syncTodaysBasketballBoxScores(new Date(), { force });

  console.log(
    `[sync-boxscore-basquete] Data ${summary.date}: ${summary.finalEvents}/${summary.eventsFound} jogos finalizados.`
  );

  if (!summary.processed.length) {
    console.log("[sync-boxscore-basquete] Nenhum jogo finalizado para processar hoje.");
    return;
  }

  for (const result of summary.processed) {
    if (result.alreadyProcessed) {
      console.log(`  • ${result.eventId}: já processado`);
      continue;
    }

    console.log(
      `  • ${result.eventId}: ${result.statsUpdated} stats, ${result.skipped} skip, ${result.failed} fail`
    );
  }
}

main().catch((error) => {
  console.error("[sync-boxscore-basquete] ERRO:", error);
  process.exit(1);
});
