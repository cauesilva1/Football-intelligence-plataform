"use server";

import { headers } from "next/headers";
import { checkRateLimit, clientAddressFromHeaders, pruneRateLimitBuckets } from "@/lib/rate-limit";

export async function getActionClientKey(prefix: string): Promise<string> {
  const h = await headers();
  return `${prefix}:${clientAddressFromHeaders(h)}`;
}

export async function enforceActionRateLimit(
  prefix: string,
  opts: { limit: number; windowMs: number; global?: boolean }
): Promise<void> {
  pruneRateLimitBuckets();
  const key = opts.global ? `${prefix}:global` : await getActionClientKey(prefix);
  const result = checkRateLimit(key, opts);
  if (!result.ok) {
    throw new Error(`RATE_LIMITED:${result.retryAfterSec}`);
  }
}
