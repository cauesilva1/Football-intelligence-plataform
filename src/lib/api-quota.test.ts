import assert from "node:assert/strict";
import test from "node:test";
import {
  API_SPORTS_MIN_REMAINING,
  ApiQuotaTracker,
  formatQuotaLog,
  parseRateLimitHeaders,
} from "./api-quota";

function headers(values: Record<string, string>) {
  const lower = new Map(Object.entries(values).map(([k, v]) => [k.toLowerCase(), v]));
  return { get: (name: string) => lower.get(name.toLowerCase()) ?? null };
}

test("parseRateLimitHeaders reads the daily pair and ignores the per-minute pair", () => {
  const parsed = parseRateLimitHeaders(
    headers({
      "x-ratelimit-requests-limit": "100",
      "x-ratelimit-requests-remaining": "87",
      "x-ratelimit-remaining": "9",
    })
  );
  assert.deepEqual(parsed, { remaining: 87, limit: 100 });
});

test("parseRateLimitHeaders tolerates missing or malformed values", () => {
  assert.deepEqual(parseRateLimitHeaders(null), { remaining: null, limit: null });
  assert.deepEqual(parseRateLimitHeaders(headers({})), { remaining: null, limit: null });
  assert.deepEqual(
    parseRateLimitHeaders(headers({ "x-ratelimit-requests-remaining": "abc" })),
    { remaining: null, limit: null }
  );
});

test("tracker estimates remaining from persisted usage until a header arrives", () => {
  const tracker = new ApiQuotaTracker("football", { usedBeforeRun: 30 });
  assert.equal(tracker.remaining, 70);
  tracker.recordCall(null);
  tracker.recordCall(null);
  assert.equal(tracker.callCount, 2);
  assert.equal(tracker.remaining, 68);
  assert.equal(tracker.snapshot().providerReported, false);
});

test("provider header overrides the estimate and later header-less calls decrement it", () => {
  const tracker = new ApiQuotaTracker("football", { usedBeforeRun: 0 });
  tracker.recordCall(headers({ "x-ratelimit-requests-remaining": "55" }));
  assert.equal(tracker.remaining, 55);
  assert.equal(tracker.used, 45);
  tracker.recordCall(null);
  assert.equal(tracker.remaining, 54);
  assert.equal(tracker.snapshot().providerReported, true);
});

test("paid calls are skipped once fewer than the minimum remain", () => {
  const tracker = new ApiQuotaTracker("basketball");
  tracker.seedRemaining(API_SPORTS_MIN_REMAINING);
  assert.equal(tracker.isLow(), false);
  assert.equal(tracker.canSpend(1), true);

  tracker.recordCall(headers({ "x-ratelimit-requests-remaining": "9" }));
  assert.equal(tracker.isLow(), true);
  assert.equal(tracker.canSpend(1), false);
  assert.equal(tracker.usableCalls(), 0);
});

test("canSpend never allows more calls than the quota has left", () => {
  const tracker = new ApiQuotaTracker("football");
  tracker.seedRemaining(12);
  assert.equal(tracker.canSpend(12), true);
  assert.equal(tracker.canSpend(13), false);
});

test("tracker keeps sports independent", () => {
  const football = new ApiQuotaTracker("football", { usedBeforeRun: 95 });
  const basketball = new ApiQuotaTracker("basketball", { usedBeforeRun: 5 });
  assert.equal(football.isLow(), true);
  assert.equal(basketball.isLow(), false);
});

test("skip reasons are deduplicated and capped; snapshot exposes counts", () => {
  const tracker = new ApiQuotaTracker("basketball");
  for (let i = 0; i < 3; i += 1) tracker.recordSkip("key missing");
  for (let i = 0; i < 10; i += 1) tracker.recordSkip(`reason ${i}`);
  const snapshot = tracker.snapshot();
  assert.equal(snapshot.skipped, 13);
  assert.equal(snapshot.skipReasons.length, 5);
  assert.equal(new Set(snapshot.skipReasons).size, 5);
});

test("formatQuotaLog never needs or leaks credentials and flags a low quota", () => {
  const tracker = new ApiQuotaTracker("football");
  tracker.recordCall(headers({ "x-ratelimit-requests-remaining": "4" }));
  const line = formatQuotaLog(tracker.snapshot());
  assert.match(line, /football quota/);
  assert.match(line, /remaining 4/);
  assert.match(line, /LOW/);
});
