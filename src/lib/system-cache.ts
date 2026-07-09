import type { Prisma } from "@prisma/client";
import { isDbSource } from "@/lib/data-source";
import { logSupabaseError } from "@/lib/db-errors";

declare global {
  // eslint-disable-next-line no-var
  var __fipSystemCache: Map<string, Prisma.InputJsonValue> | undefined;
}

const memoryCache = globalThis.__fipSystemCache ?? new Map<string, Prisma.InputJsonValue>();
if (process.env.NODE_ENV !== "production") {
  globalThis.__fipSystemCache = memoryCache;
}

export function canUseDatabase(): boolean {
  return isDbSource() && Boolean(process.env.DATABASE_URL?.trim());
}

export async function readSystemCache<T>(key: string): Promise<T | null> {
  if (isDbSource()) {
    if (!process.env.DATABASE_URL?.trim()) {
      logSupabaseError(`readSystemCache:${key}`, new Error("DATABASE_URL ausente com DATA_SOURCE=db"));
      return null;
    }

    try {
      const { getPrisma } = await import("@/lib/prisma");
      const row = await getPrisma().systemCache.findUnique({ where: { key } });
      return (row?.json as T) ?? null;
    } catch (error) {
      logSupabaseError(`readSystemCache:${key}`, error);
      return null;
    }
  }

  const value = memoryCache.get(key);
  return (value as T) ?? null;
}

export async function writeSystemCache(key: string, json: Prisma.InputJsonValue): Promise<void> {
  if (isDbSource()) {
    if (!process.env.DATABASE_URL?.trim()) {
      logSupabaseError(`writeSystemCache:${key}`, new Error("DATABASE_URL ausente com DATA_SOURCE=db"));
      return;
    }

    try {
      const { getPrisma } = await import("@/lib/prisma");
      await getPrisma().systemCache.upsert({
        where: { key },
        create: { key, json },
        update: { json },
      });
    } catch (error) {
      logSupabaseError(`writeSystemCache:${key}`, error);
    }
    return;
  }

  memoryCache.set(key, json);
}
