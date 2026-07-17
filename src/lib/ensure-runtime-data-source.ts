import { isDbSource } from "@/lib/data-source";

/**
 * Marker for routes that read live data.
 * Avoid `connection()` here — it forces dynamic rendering and defeats `revalidate`.
 * Repositories already guard with `canUseDatabase()` / `isDbSource()`.
 */
export async function ensureRuntimeDataSource(): Promise<void> {
  void isDbSource();
}
