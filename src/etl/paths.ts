import path from "path";

export const resolveCsvPath = () => {
  return path.join(process.cwd(), "data", "raw", "players_data_light-2025_2026.csv");
};
