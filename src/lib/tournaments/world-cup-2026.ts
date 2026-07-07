import { readFile } from "fs/promises";
import path from "path";
import type { StatsBombMatch } from "@/lib/statsbomb/types";

const WC2026_JSON = path.join(process.cwd(), "src/data/mock/world-cup-2026.json");

export async function loadWorldCup2026Matches(): Promise<StatsBombMatch[]> {
  const raw = await readFile(WC2026_JSON, "utf8");
  return JSON.parse(raw) as StatsBombMatch[];
}
