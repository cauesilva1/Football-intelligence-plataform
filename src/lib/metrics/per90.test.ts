import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { per90, hasReliableSoccerSample, computePer90Metrics } from "@/lib/metrics/per90";

describe("per90", () => {
  it("returns 0 for empty minutes", () => {
    assert.equal(per90(5, 0), 0);
  });

  it("soft-caps inflated rates", () => {
    // 1 goal in 11' ≈ 8.18 uncapped
    const rate = per90(1, 11, { softCap: 1.8 });
    assert.equal(rate, 1.8);
  });

  it("respects minMinutes option", () => {
    assert.equal(per90(5, 200, { minMinutes: 450 }), 0);
  });
});

describe("hasReliableSoccerSample", () => {
  it("requires 450 minutes", () => {
    assert.equal(hasReliableSoccerSample(449), false);
    assert.equal(hasReliableSoccerSample(450), true);
  });
});

describe("computePer90Metrics", () => {
  it("soft-caps goals and assists", () => {
    const metrics = computePer90Metrics({
      minutesPlayed: 45,
      goals: 3,
      assists: 2,
      shots: 5,
      keyPasses: 2,
      dribblesCompleted: 1,
      tacklesWon: 1,
      interceptions: 1,
    });
    assert.ok(metrics.goals <= 1.8);
    assert.ok(metrics.assists <= 1.8);
  });
});
