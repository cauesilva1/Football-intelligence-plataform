import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  NBA_SHOT_CHART_MAX_GAMES_PER_RUN,
  NBA_SHOT_CHART_MIN_GAME_MS,
  selectShotBackfillBatch,
} from "@/lib/basketball/shot-backfill-plan";

describe("NBA shot backfill plan", () => {
  const pending = Array.from({ length: 20 }, (_, index) => index + 1);

  it("caps a run and leaves the rest for the next one", () => {
    const plan = selectShotBackfillBatch(pending, {
      maxGames: NBA_SHOT_CHART_MAX_GAMES_PER_RUN,
      remainingMs: 270_000,
      minGameMs: NBA_SHOT_CHART_MIN_GAME_MS,
    });
    assert.equal(plan.batch.length, 10);
    assert.deepEqual(plan.batch[0], 1);
    assert.equal(plan.stoppedForTime, false);
  });

  it("shrinks the batch when the cron budget is almost gone", () => {
    const plan = selectShotBackfillBatch(pending, {
      maxGames: 10,
      remainingMs: 45_000,
      minGameMs: 20_000,
    });
    assert.deepEqual(plan.batch, [1, 2]);
    assert.equal(plan.stoppedForTime, true);
  });

  it("starts nothing when there is not enough time for one game", () => {
    const plan = selectShotBackfillBatch(pending, {
      maxGames: 10,
      remainingMs: 19_000,
      minGameMs: 20_000,
    });
    assert.deepEqual(plan.batch, []);
    assert.equal(plan.stoppedForTime, true);
  });
});
