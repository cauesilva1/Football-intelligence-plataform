import { readFile } from "fs/promises";
import path from "path";
import type { StatsBombMatch } from "@/lib/statsbomb/types";
import {
  fetchWorldCup2026LiveEvents,
  mergeWorldCupLiveScores,
  syncWorldCup2026Matches,
} from "@/lib/api/espn-matches";

const WC2026_JSON = path.join(process.cwd(), "src/data/mock/world-cup-2026.json");

export async function loadWorldCup2026Matches(): Promise<StatsBombMatch[]> {
  const raw = await readFile(WC2026_JSON, "utf8");
  const cached = JSON.parse(raw) as StatsBombMatch[];

  try {
    await syncWorldCup2026Matches();
    const live = await fetchWorldCup2026LiveEvents();
    return mergeWorldCupLiveScores(cached, live);
  } catch (error) {
    console.warn("[world-cup-2026] Live ESPN merge failed — using cached JSON:", error);
    return cached;
  }
}
