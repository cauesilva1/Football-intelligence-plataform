import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

/**
 * Local Next.js streams many RSC queries in parallel (Suspense).
 * With Supabase pooler + connection_limit=1 those requests starve (P2024).
 * Keep production conservative; widen the pool only in development.
 */
function resolveDatabaseUrl(): string {
  const raw = process.env.DATABASE_URL?.trim();
  if (!raw) {
    throw new Error("DATABASE_URL is required when DATA_SOURCE=db");
  }

  if (process.env.NODE_ENV === "production") {
    return raw;
  }

  try {
    const url = new URL(raw);
    const currentLimit = Number(url.searchParams.get("connection_limit") || "1");
    if (!Number.isFinite(currentLimit) || currentLimit < 5) {
      url.searchParams.set("connection_limit", "5");
    }
    const currentTimeout = Number(url.searchParams.get("pool_timeout") || "10");
    if (!Number.isFinite(currentTimeout) || currentTimeout < 20) {
      url.searchParams.set("pool_timeout", "20");
    }
    return url.toString();
  } catch {
    return raw;
  }
}

export function getPrisma(): PrismaClient {
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error("DATABASE_URL is required when DATA_SOURCE=db");
  }

  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient({
      datasources: {
        db: { url: resolveDatabaseUrl() },
      },
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });
  }

  return globalForPrisma.prisma;
}
