/**
 * Per-run API-Sports quota accounting. Each sport (football, basketball) has its own
 * 100 req/day quota, so each gets its own tracker. Pure — no I/O, no secrets.
 */
export const API_SPORTS_DAILY_LIMIT = 100;
/** Paid calls are skipped once fewer than this many remain. */
export const API_SPORTS_MIN_REMAINING = 10;

export type ApiSportsSport = "football" | "basketball";

export type HeaderReader = { get(name: string): string | null };

export interface ParsedRateLimit {
  remaining: number | null;
  limit: number | null;
}

function parseIntHeader(headers: HeaderReader, names: string[]): number | null {
  for (const name of names) {
    const raw = headers.get(name);
    if (raw == null || raw.trim() === "") continue;
    const value = Number(raw);
    if (Number.isFinite(value) && value >= 0) return Math.floor(value);
  }
  return null;
}

/** Daily quota headers (the per-minute pair is `x-ratelimit-remaining`, ignored here). */
export function parseRateLimitHeaders(headers?: HeaderReader | null): ParsedRateLimit {
  if (!headers) return { remaining: null, limit: null };
  return {
    remaining: parseIntHeader(headers, [
      "x-ratelimit-requests-remaining",
      "X-RateLimit-Requests-Remaining",
    ]),
    limit: parseIntHeader(headers, ["x-ratelimit-requests-limit", "X-RateLimit-Requests-Limit"]),
  };
}

export interface ApiQuotaSnapshot {
  sport: ApiSportsSport;
  /** API-Sports calls made during this run. */
  calls: number;
  limit: number;
  /** Provider-reported (or estimated) calls left today. */
  remaining: number;
  used: number;
  minRemaining: number;
  /** True when the remaining quota is below the safety floor. */
  lowQuota: boolean;
  /** Paid calls that were not made because of a low/absent quota or missing key. */
  skipped: number;
  skipReasons: string[];
  /** True once a real x-ratelimit header has been read this run. */
  providerReported: boolean;
}

export interface ApiQuotaOptions {
  limit?: number;
  minRemaining?: number;
  /** Calls already spent today before this run (from the persisted counter). */
  usedBeforeRun?: number;
}

const MAX_SKIP_REASONS = 5;

export class ApiQuotaTracker {
  readonly sport: ApiSportsSport;
  private limit: number;
  readonly minRemaining: number;
  private usedBeforeRun: number;
  private calls = 0;
  private providerRemaining: number | null = null;
  private skipped = 0;
  private skipReasons: string[] = [];

  constructor(sport: ApiSportsSport, options: ApiQuotaOptions = {}) {
    this.sport = sport;
    this.limit = options.limit ?? API_SPORTS_DAILY_LIMIT;
    this.minRemaining = options.minRemaining ?? API_SPORTS_MIN_REMAINING;
    this.usedBeforeRun = Math.max(0, options.usedBeforeRun ?? 0);
  }

  get callCount(): number {
    return this.calls;
  }

  /** Provider-reported remaining when known, otherwise limit − used − calls this run. */
  get remaining(): number {
    if (this.providerRemaining != null) return this.providerRemaining;
    return Math.max(0, this.limit - this.usedBeforeRun - this.calls);
  }

  get used(): number {
    return Math.max(0, this.limit - this.remaining);
  }

  /** Seed the provider-reported value (e.g. persisted from an earlier run today). */
  seedRemaining(remaining: number): void {
    if (Number.isFinite(remaining) && remaining >= 0) {
      this.providerRemaining = Math.floor(remaining);
    }
  }

  /** Record one request that reached the provider; reads quota headers when present. */
  recordCall(headers?: HeaderReader | null): void {
    this.calls += 1;
    const parsed = parseRateLimitHeaders(headers);
    if (parsed.limit != null && parsed.limit > 0) this.limit = parsed.limit;
    if (parsed.remaining != null) {
      this.providerRemaining = parsed.remaining;
    } else if (this.providerRemaining != null) {
      this.providerRemaining = Math.max(0, this.providerRemaining - 1);
    }
  }

  isLow(): boolean {
    return this.remaining < this.minRemaining;
  }

  /** Calls still available to paid work: zero once fewer than `minRemaining` remain. */
  usableCalls(): number {
    return this.isLow() ? 0 : this.remaining;
  }

  canSpend(calls = 1): boolean {
    return !this.isLow() && calls <= this.remaining;
  }

  recordSkip(reason: string): void {
    this.skipped += 1;
    if (!this.skipReasons.includes(reason) && this.skipReasons.length < MAX_SKIP_REASONS) {
      this.skipReasons.push(reason);
    }
  }

  snapshot(): ApiQuotaSnapshot {
    return {
      sport: this.sport,
      calls: this.calls,
      limit: this.limit,
      remaining: this.remaining,
      used: this.used,
      minRemaining: this.minRemaining,
      lowQuota: this.isLow(),
      skipped: this.skipped,
      skipReasons: [...this.skipReasons],
      providerReported: this.providerRemaining != null,
    };
  }
}

export function formatQuotaLog(snapshot: ApiQuotaSnapshot): string {
  return `${snapshot.sport} quota — calls this run: ${snapshot.calls} · used ${snapshot.used}/${snapshot.limit} · remaining ${snapshot.remaining}${snapshot.providerReported ? "" : " (estimated)"}${snapshot.lowQuota ? " · LOW" : ""}`;
}
