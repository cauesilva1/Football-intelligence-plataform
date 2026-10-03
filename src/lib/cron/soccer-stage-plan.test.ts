import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  SOCCER_CRON_STAGE_BUDGET,
  deadlineFrom,
  interleaveRoundRobin,
  isPastDeadline,
  orderBySyncStaleness,
} from "./soccer-stage-plan";

describe("soccer stage budget", () => {
  it("runs boxscores, then fixtures, then enrichment, all inside 300s", () => {
    const b = SOCCER_CRON_STAGE_BUDGET;
    assert.ok(b.boxscoresUntilMs < b.fixturesUntilMs);
    assert.ok(b.fixturesUntilMs < b.enrichmentStartsBeforeMs);
    assert.ok(b.enrichmentStartsBeforeMs < 300_000);
  });

  it("computes absolute deadlines and detects expiry", () => {
    const deadline = deadlineFrom(1_000, 150_000);
    assert.equal(deadline, 151_000);
    assert.equal(isPastDeadline(deadline, 150_999), false);
    assert.equal(isPastDeadline(deadline, 151_000), true);
    assert.equal(isPastDeadline(undefined, 9e12), false);
  });
});

describe("orderBySyncStaleness", () => {
  const leagues = [
    { espnSlug: "bra.1" },
    { espnSlug: "usa.1" },
    { espnSlug: "eng.1" },
    { espnSlug: "esp.1" },
  ];

  it("puts never-synced and stalest leagues first", () => {
    const last = new Map<string, Date>([
      ["bra.1", new Date("2026-10-03T06:55:00Z")],
      ["usa.1", new Date("2026-10-03T06:58:00Z")],
      ["esp.1", new Date("2026-08-18T20:00:00Z")],
    ]);
    assert.deepEqual(
      orderBySyncStaleness(leagues, last).map((l) => l.espnSlug),
      ["eng.1", "esp.1", "bra.1", "usa.1"]
    );
  });

  it("keeps configured order on ties and does not mutate the input", () => {
    const copy = [...leagues];
    const ordered = orderBySyncStaleness(leagues, new Map());
    assert.deepEqual(ordered.map((l) => l.espnSlug), copy.map((l) => l.espnSlug));
    assert.deepEqual(leagues, copy);
  });
});

describe("interleaveRoundRobin", () => {
  it("alternates between groups so no league is starved", () => {
    assert.deepEqual(interleaveRoundRobin([["a1", "a2", "a3"], ["b1"], [], ["c1", "c2"]]), [
      "a1",
      "b1",
      "c1",
      "a2",
      "c2",
      "a3",
    ]);
  });

  it("returns an empty list for no groups", () => {
    assert.deepEqual(interleaveRoundRobin([]), []);
  });
});
