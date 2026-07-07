/** App-wide config for demo / deploy modes */
export const appConfig = {
  name: "Football Intelligence Platform",
  season: "2025/26",
  dataSource: process.env.DATA_SOURCE ?? "mock",
  isVercel: process.env.VERCEL === "1",
} as const;
