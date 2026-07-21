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

/** Drop the singleton so the next getPrisma() opens a fresh connection (long ETL / P1017). */
export async function resetPrismaConnection(): Promise<void> {
  const current = globalForPrisma.prisma;
  globalForPrisma.prisma = undefined;
  if (current) {
    await current.$disconnect().catch(() => undefined);
  }
}

export function isTransientPrismaError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error ? String((error as { code: unknown }).code) : "";
  if (code === "P1017" || code === "P1001" || code === "P2024" || code === "P1008") {
    return true;
  }
  const message =
    error instanceof Error
      ? error.message
      : "message" in error
        ? String((error as { message: unknown }).message)
        : String(error);
  return (
    /server has closed the connection/i.test(message) ||
    /can't reach database server/i.test(message) ||
    /connection.*closed/i.test(message) ||
    /timed out/i.test(message)
  );
}

export async function withPrismaRetry<T>(
  fn: () => Promise<T>,
  options: { attempts?: number; label?: string } = {}
): Promise<T> {
  const attempts = options.attempts ?? 3;
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!isTransientPrismaError(error) || attempt === attempts) {
        throw error;
      }
      console.warn(
        `[prisma] transient ${options.label ?? "query"} (attempt ${attempt}/${attempts}) — reconnecting…`,
        error instanceof Error ? error.message : error
      );
      await resetPrismaConnection();
      await getPrisma().$connect();
      await new Promise((r) => setTimeout(r, 400 * attempt));
    }
  }

  throw lastError;
}
