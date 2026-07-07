import { getDataSource, isDbSource } from "@/lib/data-source";

/** App-wide config for demo / deploy modes */
export const appConfig = {
  name: "Football Intelligence Platform",
  season: "2025/26",
  get dataSource() {
    return getDataSource();
  },
  isVercel: process.env.VERCEL === "1",
} as const;

export { isDbSource };
