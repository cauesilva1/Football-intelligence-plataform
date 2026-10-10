import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  classifySoccerZone,
  conversionPctOrNull,
  isPlausiblePitchCoordinate,
  normalizeAttackingPoint,
} from "@/lib/soccer/shot-zones";

describe("soccer shot zones", () => {
  it("places box, arc, and wide channels on the normalized pitch", () => {
    assert.equal(classifySoccerZone(97, 50), "six_yard");
    assert.equal(classifySoccerZone(88.5, 50), "penalty_area");
    assert.equal(classifySoccerZone(82, 50), "arch");
    assert.equal(classifySoccerZone(70, 64.6), "outside_box");
    assert.equal(classifySoccerZone(70, 10), "left_side");
    assert.equal(classifySoccerZone(70, 90), "right_side");
    assert.equal(classifySoccerZone(93.2, 12.8), "left_side");
  });

  it("drops coordinates outside 0–100 instead of inventing a spot", () => {
    assert.equal(classifySoccerZone(-1, 50), null);
    assert.equal(classifySoccerZone(50, 140), null);
    assert.equal(isPlausiblePitchCoordinate(Number.NaN, 40), false);
    assert.equal(normalizeAttackingPoint(101, 50, 100), null);
  });

  it("rotates shots that attack the goal at x = 0", () => {
    assert.deepEqual(normalizeAttackingPoint(15, 40, 2), { x: 85, y: 60 });
    assert.deepEqual(normalizeAttackingPoint(86.8, 72.7, 100), { x: 86.8, y: 72.7 });
  });

  it("hides a percentage under 5 attempts", () => {
    assert.equal(conversionPctOrNull(4, 4), null);
    assert.equal(conversionPctOrNull(3, 5), 60);
  });
});
