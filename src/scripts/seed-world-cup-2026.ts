/**
 * Seed / refresh FIFA World Cup 2026 fixtures into Match from curated JSON.
 * Rewrites home/away FKs to national teams under the fifa.world competition.
 *
 * Uso: npm run data:seed-wc2026
 */
import { seedWorldCupDbFromJson, countHealthyWorldCupDbFixtures } from "@/lib/tournaments/world-cup-2026";

async function main() {
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error("DATABASE_URL ausente. Configure .env antes de executar o seed.");
  }

  console.log("[seed-wc2026] Seeding World Cup fixtures from JSON → DB…");
  const saved = await seedWorldCupDbFromJson();
  const healthy = await countHealthyWorldCupDbFixtures();
  console.log(`[seed-wc2026] Upserted ${saved} rows · healthy national fixtures: ${healthy}`);
}

main().catch((error) => {
  console.error("[seed-wc2026] Fatal:", error);
  process.exit(1);
});
