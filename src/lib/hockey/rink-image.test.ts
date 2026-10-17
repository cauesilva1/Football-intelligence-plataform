import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { HockeyShotChart } from "@/features/scouting/components/profile/hockey-shot-chart";
import { buildHockeyShotChart } from "@/lib/hockey/rink-geometry";
import {
  HOCKEY_RINK_IMAGE,
  HOCKEY_RINK_SURFACE,
  hockeyImagePoint,
  hockeyRinkViewBox,
} from "@/lib/hockey/rink-image";

function near(actual: { x: number; y: number }, expected: { x: number; y: number }, px: number) {
  assert.ok(
    Math.hypot(actual.x - expected.x, actual.y - expected.y) <= px,
    `expected (${expected.x}, ${expected.y}) ±${px}, got (${actual.x.toFixed(1)}, ${actual.y.toFixed(1)})`
  );
}

describe("hockey rink image coordinates", () => {
  it("maps the rink corners onto the measured ice, not the dark margin", () => {
    const topLeft = hockeyImagePoint(-100, 42.5);
    const bottomRight = hockeyImagePoint(100, -42.5);
    assert.equal(topLeft.x, HOCKEY_RINK_SURFACE.left);
    assert.equal(topLeft.y, HOCKEY_RINK_SURFACE.top);
    assert.equal(bottomRight.x, HOCKEY_RINK_SURFACE.right);
    assert.equal(bottomRight.y, HOCKEY_RINK_SURFACE.bottom);
    assert.ok(topLeft.x > 0);
    assert.ok(topLeft.y > 0);
    assert.ok(bottomRight.x < HOCKEY_RINK_IMAGE.width);
    assert.ok(bottomRight.y < HOCKEY_RINK_IMAGE.height);
  });

  it("puts the center and both end-zone faceoff dots on the painted marks", () => {
    // Dot centroids measured on public/maps/hockey-rink.png.
    near(hockeyImagePoint(0, 0), { x: 510.8, y: 283.8 }, 3);
    near(hockeyImagePoint(-69, 22), { x: 189.5, y: 162.2 }, 12);
    near(hockeyImagePoint(69, 22), { x: 833, y: 162 }, 12);
    near(hockeyImagePoint(69, -22), { x: 833, y: 408.4 }, 12);
  });

  it("keeps a real faceoff-dot shot on that dot after the attacking-half fold", () => {
    // Stored (-69, -23) folds to (69, 23), one foot from the painted upper-right dot.
    near(hockeyImagePoint(69, 23), { x: 833, y: 162 }, 12);
  });

  it("crops the attacking half at center ice and uses the rink photo", () => {
    assert.equal(hockeyRinkViewBox("full"), `0 0 ${HOCKEY_RINK_IMAGE.width} ${HOCKEY_RINK_IMAGE.height}`);
    assert.match(hockeyRinkViewBox("offense"), /^512 /);
    const model = buildHockeyShotChart({
      playerId: "p",
      selectedSeason: "202627",
      seasonLabel: "2026-27 regular season",
      seasons: [],
      rows: [{ x: -69, y: -23, made: true, gameId: "g" }],
    });
    const html = renderToStaticMarkup(createElement(HockeyShotChart, { model, view: "full" }));
    assert.match(html, /href="\/maps\/hockey-rink\.png"/);
    assert.match(html, /data-rink-view="full"/);
    assert.match(html, /data-outcome="goal"/);
    const empty = buildHockeyShotChart({
      playerId: "p",
      selectedSeason: "202627",
      seasonLabel: "2026-27 regular season",
      seasons: [],
      rows: [],
    });
    const emptyHtml = renderToStaticMarkup(createElement(HockeyShotChart, { model: empty }));
    assert.match(emptyHtml, /No shot data yet/);
    assert.doesNotMatch(emptyHtml, /hockey-rink\.png/);
  });
});
