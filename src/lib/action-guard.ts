"use server";

import { headers } from "next/headers";
import { checkRateLimit, pruneRateLimitBuckets } from "@/lib/rate-limit";

export async function getActionClientKey(prefix: string): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = h.get("x-real-ip")?.trim();
  const ip = forwarded || realIp || "anonymous";
  return `${prefix}:${ip}`;
}

export async function enforceActionRateLimit(
  prefix: string,
  opts: { limit: number; windowMs: number }
): Promise<void> {
  pruneRateLimitBuckets();
  const key = await getActionClientKey(prefix);
  const result = checkRateLimit(key, opts);
  if (!result.ok) {
    throw new Error(`RATE_LIMITED:${result.retryAfterSec}`);
  }
}
