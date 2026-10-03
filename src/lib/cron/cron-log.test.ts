import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  cronBudgetSnapshot,
  endCronRun,
  errorMessage,
  formatCronLogLine,
  startCronRun,
} from "./cron-log";

describe("cron-log", () => {
  afterEach(() => endCronRun());

  it("formats a JSON line with budget and drops undefined fields", () => {
    const line = JSON.parse(
      formatCronLogLine("cron-soccer", "fixtures_league", { league: "mls", saved: 3, extra: undefined }, {
        elapsedMs: 1000,
        remainingMs: 299_000,
      })
    );
    assert.equal(line.scope, "cron-soccer");
    assert.equal(line.event, "fixtures_league");
    assert.equal(line.league, "mls");
    assert.equal(line.remainingMs, 299_000);
    assert.ok(!("extra" in line));
  });

  it("redacts secret-looking field names", () => {
    const line = JSON.parse(formatCronLogLine("s", "e", { apiKey: "abc", authorization: "Bearer x" }));
    assert.equal(line.apiKey, "[redacted]");
    assert.equal(line.authorization, "[redacted]");
  });

  it("strips credentials embedded in error messages", () => {
    assert.equal(
      errorMessage(new Error("fetch failed https://x.test/?apikey=SECRET123&a=1")),
      "fetch failed https://x.test/?apikey=[redacted]&a=1"
    );
  });

  it("computes remaining budget for the active run only", () => {
    assert.equal(cronBudgetSnapshot(), null);
    startCronRun("cron-soccer", 300_000, 1_000);
    assert.deepEqual(cronBudgetSnapshot(61_000), { elapsedMs: 60_000, remainingMs: 240_000 });
  });
});
