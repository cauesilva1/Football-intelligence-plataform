import path from "path";
import fs from "fs";

export const resolveCsvPath = () => {
  const rawDir = path.join(process.cwd(), "data", "raw");
  const candidates = [
    path.join(rawDir, "players_data-2025_2026.csv"),
    path.join(rawDir, "players_data_light-2025_2026.csv"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return candidates[1];
};
