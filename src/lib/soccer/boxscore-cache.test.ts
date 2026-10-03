import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isBoxscoreCacheComplete, shouldCacheBoxscore } from "./boxscore-cache";

describe("shouldCacheBoxscore", () => {
  it("never caches a match with zero rows written", () => {
    assert.equal(shouldCacheBoxscore({ statsUpserted: 0, failed: 0 }), false);
    assert.equal(shouldCacheBoxscore({ statsUpserted: 0, failed: 12 }), false);
  });

  it("does not cache when any player write failed", () => {
    assert.equal(shouldCacheBoxscore({ statsUpserted: 20, failed: 1 }), false);
  });

  it("caches a clean, non-empty write", () => {
    assert.equal(shouldCacheBoxscore({ statsUpserted: 28, failed: 0 }), true);
  });
});

describe("isBoxscoreCacheComplete", () => {
  it("honors the explicit complete flag", () => {
    assert.equal(isBoxscoreCacheComplete({ complete: true, statsUpserted: 1, playersProcessed: 30 }), true);
    assert.equal(isBoxscoreCacheComplete({ complete: false, statsUpserted: 30, playersProcessed: 30 }), false);
  });

  it("treats legacy entries with all rows written as complete", () => {
    assert.equal(isBoxscoreCacheComplete({ playersProcessed: 32, statsUpserted: 32 }), true);
  });

  it("treats legacy partial and empty entries as incomplete", () => {
    assert.equal(isBoxscoreCacheComplete({ playersProcessed: 32, statsUpserted: 28 }), false);
    assert.equal(isBoxscoreCacheComplete({ playersProcessed: 32, statsUpserted: 16 }), false);
    assert.equal(isBoxscoreCacheComplete({ playersProcessed: 0, statsUpserted: 0 }), false);
  });

  it("treats malformed payloads as incomplete", () => {
    assert.equal(isBoxscoreCacheComplete(null), false);
    assert.equal(isBoxscoreCacheComplete("x"), false);
  });
});
