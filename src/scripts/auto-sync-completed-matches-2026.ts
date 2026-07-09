/**
 * Cron engine — descobre partidas finalizadas do Brasileirão 2026 na ESPN
 * e dispara processMatchBoxScore2026 para cada jogo ainda não processado.
 *
 * Uso: npm run data:cron-sync-2026
 */
import fs from "fs";
import path from "path";
import { processMatchBoxScore2026 } from "@/lib/api/espn-boxscore";
import { getPrisma } from "@/lib/prisma";

const ESPN_SLUG = "bra.1";
const SCOREBOARD_URL = `https://site.api.espn.com/apis/site/v2/sports/soccer/${ESPN_SLUG}/scoreboard`;

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

interface EspnScoreboardEvent {
  id: string;
  name?: string;
  status?: { type?: { name?: string; state?: string; completed?: boolean } };
  competitions?: Array<{
    status?: { type?: { name?: string; state?: string; completed?: boolean } };
  }>;
}

interface EspnScoreboardResponse {
  events?: EspnScoreboardEvent[];
}

function formatEspnDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

function isFinalEvent(event: EspnScoreboardEvent): boolean {
  const status = event.competitions?.[0]?.status?.type ?? event.status?.type;
  if (!status) return false;

  return (
    status.name === "STATUS_FINAL" ||
    status.completed === true ||
    status.state === "post"
  );
}

async function fetchScoreboard(date = new Date()): Promise<EspnScoreboardEvent[]> {
  const url = `${SCOREBOARD_URL}?dates=${formatEspnDate(date)}`;
  const response = await fetch(url, {
    headers: {
      "User-Agent": "football-intelligence-platform/1.0 (brasileirao-cron-2026)",
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(45_000),
  });

  if (!response.ok) {
    throw new Error(`ESPN scoreboard HTTP ${response.status}`);
  }

  const payload = (await response.json()) as EspnScoreboardResponse;
  return payload.events ?? [];
}

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error("DATABASE_URL ausente. Configure .env antes de executar o cron.");
  }

  console.log("[cron-sync-2026] Buscando placares do dia na ESPN...");
  const events = await fetchScoreboard();
  const finished = events.filter(isFinalEvent);

  console.log(
    `[cron-sync-2026] Eventos: ${events.length} · finalizados: ${finished.length}`
  );

  if (!finished.length) {
    console.log("[cron-sync-2026] Nenhuma partida encerrada para processar hoje.");
    return;
  }

  let processed = 0;
  let skipped = 0;
  let failed = 0;

  for (const event of finished) {
    const matchId = event.id;
    const label = event.name ?? matchId;

    try {
      const result = await processMatchBoxScore2026(matchId);

      if (result.alreadyProcessed) {
        skipped += 1;
        console.log(`[cron-sync-2026] SKIP cache: ${label} (${matchId})`);
        continue;
      }

      processed += 1;
      console.log(
        `[cron-sync-2026] OK ${label} (${matchId}) — atletas: ${result.playersProcessed} · stats: ${result.statsUpserted} · criados: ${result.playersCreated} · falhas: ${result.failed}`
      );
    } catch (error) {
      failed += 1;
      console.warn(`[cron-sync-2026] FAIL ${label} (${matchId}):`, error);
    }
  }

  console.log(
    `[cron-sync-2026] Concluído — processados: ${processed} · já em cache: ${skipped} · falhas: ${failed}`
  );
}

main()
  .catch((error: unknown) => {
    console.error("[cron-sync-2026] Erro fatal:", error);
    process.exit(1);
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });
