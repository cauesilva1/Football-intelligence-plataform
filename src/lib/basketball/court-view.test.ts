import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  COURT_VIEW,
  DEFENSE_HALF_VIEW,
  OFFENSE_HALF_VIEW,
  parseNbaCourtView,
} from "@/lib/basketball/court-geometry";

function box(viewBox: string) {
  const [x, y, width, height] = viewBox.split(" ").map(Number);
  return { x, y, width, height, bottom: y + height };
}

describe("NBA court views", () => {
  it("crops offense and defense to opposite halves of the same court", () => {
    const full = box(COURT_VIEW.viewBox);
    const offense = box(OFFENSE_HALF_VIEW.viewBox);
    const defense = box(DEFENSE_HALF_VIEW.viewBox);

    assert.equal(offense.x, full.x);
    assert.equal(defense.x, full.x);
    assert.equal(offense.width, full.width);
    assert.equal(defense.width, full.width);
    assert.equal(defense.y, full.y);
    assert.ok(offense.y > full.y);
    assert.ok(defense.bottom < offense.bottom);
    assert.ok(offense.bottom <= full.bottom + 1);
    assert.ok(offense.height < full.height);
    assert.ok(defense.height < full.height);
  });

  it("defaults a missing court param to offense", () => {
    assert.equal(parseNbaCourtView(undefined), "offense");
    assert.equal(parseNbaCourtView("defense"), "defense");
    assert.equal(parseNbaCourtView("full"), "full");
    assert.equal(parseNbaCourtView("nope"), "offense");
  });
});
