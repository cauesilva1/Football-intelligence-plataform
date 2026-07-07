import type { Prisma } from "@prisma/client";
import { isDbSource } from "@/lib/data-source";

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
  if (!canUseDatabase()) {
    const value = memoryCache.get(key);
    return (value as T) ?? null;
  }

  const { getPrisma } = await import("@/lib/prisma");
  const row = await getPrisma().systemCache.findUnique({ where: { key } });
  return (row?.json as T) ?? null;
}

export async function writeSystemCache(key: string, json: Prisma.InputJsonValue): Promise<void> {
  if (!canUseDatabase()) {
    memoryCache.set(key, json);
    return;
  }

  const { getPrisma } = await import("@/lib/prisma");
  await getPrisma().systemCache.upsert({
    where: { key },
    create: { key, json },
    update: { json },
  });
}
