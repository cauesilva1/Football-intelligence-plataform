/**
 * Enrich PlayerMatchStat defensive fields from API-Football (/fixtures/players).
 *
 * Usage:
 *   npm run data:enrich-defense -- --limit=40
 *   npm run data:enrich-defense -- --limit=20 --competition=La Liga
 *   npm run data:enrich-defense -- --limit=30 --since=2026-04-01
 */
import { enrichPlayerMatchDefense } from "@/lib/api/enrich-match-defense";

function argValue(flag: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`${flag}=`));
  if (hit) return hit.slice(flag.length + 1);
  const idx = process.argv.indexOf(flag);
  if (idx >= 0 && process.argv[idx + 1] && !process.argv[idx + 1].startsWith("--")) {
    return process.argv[idx + 1];
  }
  return undefined;
}

async function main() {
  const limit = Number(argValue("--limit") ?? "40");
  const competition = argValue("--competition");
  const since = argValue("--since");

  console.log(
    `[enrich-defense] limit=${limit}` +
      (competition ? ` competition=${competition}` : "") +
      (since ? ` since=${since}` : "")
  );

  const result = await enrichPlayerMatchDefense({
    limit: Number.isFinite(limit) ? limit : 40,
    competition,
    since,
  });

  console.log("[enrich-defense] done", result);
  if (result.quota.used >= result.quota.limit) {
    console.warn(
      `[enrich-defense] API quota exhausted for ${result.quota.date} (${result.quota.used}/${result.quota.limit}). Resume tomorrow.`
    );
  }
}

main().catch((error) => {
  console.error("[enrich-defense] fatal", error);
  process.exit(1);
});
