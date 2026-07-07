/** Normalized DATA_SOURCE flag — trim/case-safe for Vercel env vars. */
export function getDataSource(): "mock" | "db" {
  const raw = process.env.DATA_SOURCE?.trim().toLowerCase();
  return raw === "db" ? "db" : "mock";
}

export function isDbSource(): boolean {
  return getDataSource() === "db";
}
