import { getDataSource } from "@/lib/data-source";
import { LIVE_EUROPEAN_SEASON } from "@/lib/seasons";

export const APP_NAME = "OmniScout";
export const APP_TAGLINE = "Multi-Sport Intelligence Platform";

/** App-wide config for demo / deploy modes */
export const appConfig = {
  name: APP_NAME,
  tagline: APP_TAGLINE,
  season: LIVE_EUROPEAN_SEASON,
  get dataSource() {
    return getDataSource();
  },
  isVercel: process.env.VERCEL === "1",
} as const;

export { isDbSource } from "@/lib/data-source";
