import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CORNER_BREAK_Y_FT,
  classifyBasketballZone,
  fgPctOrNull,
  isPlausibleCourtCoordinate,
  zoneEfficiencyFill,
} from "@/lib/basketball/shot-zones";

describe("basketball shot zones", () => {
  it("places the corner break where the 22 ft line meets the 23.75 ft arc", () => {
    assert.ok(CORNER_BREAK_Y_FT > 8.9 && CORNER_BREAK_Y_FT < 9);
  });

  it("classifies field goals from the ESPN court (rim at x=25, y=0)", () => {
    assert.equal(classifyBasketballZone(24, 1, 2), "restricted_area");
    assert.equal(classifyBasketballZone(25, 4, 2), "restricted_area");
    assert.equal(classifyBasketballZone(25, 8, 2), "paint");
    assert.equal(classifyBasketballZone(31, 5, 2), "paint");
    assert.equal(classifyBasketballZone(25, 13.75, 2), "paint");
    assert.equal(classifyBasketballZone(25, 13.76, 2), "mid_range");
    assert.equal(classifyBasketballZone(16.9, 10, 2), "mid_range");
    assert.equal(classifyBasketballZone(10, 16, 2), "mid_range");
    assert.equal(classifyBasketballZone(1, 6, 3), "corner_3");
    assert.equal(classifyBasketballZone(50, 1, 3), "corner_3");
    assert.equal(classifyBasketballZone(49, -3, 3), "corner_3");
    assert.equal(classifyBasketballZone(48, 12, 3), "above_the_break_3");
    assert.equal(classifyBasketballZone(5, 16, 3), "above_the_break_3");
    assert.equal(classifyBasketballZone(23, 26, 3), "above_the_break_3");
    assert.equal(classifyBasketballZone(45, 48, 3), "above_the_break_3");
  });

  it("refuses free throws and sentinel coordinates instead of inventing a spot", () => {
    assert.equal(classifyBasketballZone(25, 1, 1), null);
    assert.equal(classifyBasketballZone(-214748340, -214748365, 2), null);
    assert.equal(isPlausibleCourtCoordinate(-214748340, 1), false);
    assert.equal(isPlausibleCourtCoordinate(Number.NaN, 4), false);
    assert.equal(classifyBasketballZone(25, 10, Number.NaN), null);
  });

  it("hides a percentage under 5 attempts and publishes it from 5", () => {
    assert.equal(fgPctOrNull(4, 4), null);
    assert.equal(fgPctOrNull(2, 3), null);
    assert.equal(fgPctOrNull(1, 5), 20);
    assert.equal(fgPctOrNull(5, 10), 50);
    assert.equal(fgPctOrNull(11, 10), null);
  });

  it("greys out small samples and deepens the fill as efficiency rises", () => {
    const hidden = zoneEfficiencyFill(100, 4);
    const cool = zoneEfficiencyFill(32, 20);
    const hot = zoneEfficiencyFill(70, 20);
    assert.equal(hidden.fill, "#d4d4d8");
    assert.equal(zoneEfficiencyFill(null, 20).fill, "#d4d4d8");
    assert.notEqual(cool.fill, hot.fill);
    assert.equal(hot.ink, "#f8fafc");
    assert.equal(cool.ink, "#0f172a");
  });
});
