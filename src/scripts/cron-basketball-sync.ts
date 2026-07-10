/**
 * Cron engine NBA — varre jogos finalizados do dia anterior e do dia corrente,
 * acumulando box scores na temporada 202627 (mesmo fluxo do Brasileirão 2026).
 *
 * Uso: npm run data:cron-basquete
 *      npm run data:cron-basquete -- --force
 */
import fs from "fs";
import path from "path";
import { runBasketballDailySync } from "@/lib/cron/basketball-daily-sync";
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

const force = process.argv.includes("--force");

runBasketballDailySync({ force })
  .catch((error: unknown) => {
    console.error("[BASKETBALL-CRON] Erro fatal:", error);
    process.exit(1);
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });
