import { getDataSource } from "@/lib/data-source";
import { CURRENT_SEASON } from "@/lib/seasons";

/** App-wide config for demo / deploy modes */
export const appConfig = {
  name: "Football Intelligence Platform",
  season: CURRENT_SEASON,
  get dataSource() {
    return getDataSource();
  },
  isVercel: process.env.VERCEL === "1",
} as const;

export { isDbSource } from "@/lib/data-source";
