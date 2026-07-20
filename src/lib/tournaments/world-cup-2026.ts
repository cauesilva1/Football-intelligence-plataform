import { readFile } from "fs/promises";
import path from "path";
import type { StatsBombMatch } from "@/lib/statsbomb/types";
import {
  fetchWorldCup2026LiveEvents,
  mergeWorldCupLiveScores,
  syncWorldCup2026Matches,
} from "@/lib/api/espn-matches";
import { canUseDatabase, readSystemCache, writeSystemCache } from "@/lib/system-cache";
import { isStale, MATCH_SYNC_TTL_MS } from "@/lib/sync/data-staleness";

const WC2026_JSON = path.join(process.cwd(), "src/data/mock/world-cup-2026.json");
const WC_SYNC_CACHE_KEY = "wc2026:fixtures:last-sync";

/** Soft DB refresh behind TTL — never blocks the tournament UI. */
function kickOffWorldCupFixtureSync(): void {
  if (!canUseDatabase()) return;

  void (async () => {
    try {
      const last = await readSystemCache<{ fetchedAt?: string }>(WC_SYNC_CACHE_KEY);
      const fetchedAt = last?.fetchedAt ? new Date(last.fetchedAt) : null;
      if (!isStale(fetchedAt, MATCH_SYNC_TTL_MS)) return;

      const saved = await syncWorldCup2026Matches();
      await writeSystemCache(WC_SYNC_CACHE_KEY, {
        fetchedAt: new Date().toISOString(),
        saved,
      });
    } catch (error) {
      console.warn("[world-cup-2026] DB fixture sync skipped:", error);
    }
  })();
}

/**
 * Hub page load: local JSON only (fast). ESPN sync/merge runs in the background
 * so the tournament UI does not wait on 30+ scoreboard requests.
 */
export async function loadWorldCup2026Matches(): Promise<StatsBombMatch[]> {
  const raw = await readFile(WC2026_JSON, "utf8");
  const cached = JSON.parse(raw) as StatsBombMatch[];

  kickOffWorldCupFixtureSync();

  return cached;
}

/** Optional live merge for cron / scripts — not used on the hub request path. */
export async function loadWorldCup2026MatchesWithLiveScores(): Promise<StatsBombMatch[]> {
  const cached = await loadWorldCup2026Matches();
  try {
    const live = await fetchWorldCup2026LiveEvents();
    return mergeWorldCupLiveScores(cached, live);
  } catch (error) {
    console.warn("[world-cup-2026] Live ESPN merge failed — using cached JSON:", error);
    return cached;
  }
}
