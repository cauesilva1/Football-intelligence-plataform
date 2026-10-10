import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sharedTrackedSeasons, zoneOnTargetDelta } from "@/lib/soccer/map-compare";

describe("soccer map compare", () => {
  it("lists only seasons both players have tracked", () => {
    assert.deepEqual(sharedTrackedSeasons([2026, 2025], [2024, 2026]), [2026]);
    assert.deepEqual(sharedTrackedSeasons([2026], [2025]), []);
  });

  it("hides a zone delta when either rate is withheld", () => {
    assert.deepEqual(zoneOnTargetDelta(42.9, null), { winner: "hidden", delta: null });
    assert.deepEqual(zoneOnTargetDelta(null, 20), { winner: "hidden", delta: null });
  });

  it("names the higher on-target rate and a level zone", () => {
    assert.deepEqual(zoneOnTargetDelta(42.9, 30), { winner: "a", delta: 12.9 });
    assert.deepEqual(zoneOnTargetDelta(20, 36.8), { winner: "b", delta: -16.8 });
    assert.deepEqual(zoneOnTargetDelta(40, 40), { winner: "tie", delta: 0 });
  });
});
