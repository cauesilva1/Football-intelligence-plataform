import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NbaShotChart } from "@/features/scouting/components/profile/nba-shot-chart";
import type { NbaShotChartModel } from "@/features/scouting/queries/nba-shot-chart";
import { shotMarkerPoint } from "@/lib/basketball/court-geometry";
import { BASKETBALL_SHOT_ZONES, ZONE_LABELS } from "@/lib/basketball/shot-zones";
import {
  BASKETBALL_COURT_IMAGE,
  basketballCourtViewBox,
  basketballImagePoint,
  basketballSvgToImage,
} from "@/lib/basketball/court-image";

function imagePixel(feetFromLeft: number, feetFromBaseline: number) {
  const display = basketballImagePoint(feetFromLeft, feetFromBaseline);
  return { x: BASKETBALL_COURT_IMAGE.width - display.y, y: display.x };
}

function near(actual: { x: number; y: number }, expected: { x: number; y: number }, px: number) {
  assert.ok(
    Math.hypot(actual.x - expected.x, actual.y - expected.y) <= px,
    `expected (${expected.x}, ${expected.y}) ±${px}, got (${actual.x.toFixed(1)}, ${actual.y.toFixed(1)})`
  );
}

describe("basketball court image coordinates", () => {
  it("uses the same map for court-feet drawings and shot markers", () => {
    const shot = shotMarkerPoint(23, 2);
    const fromSvg = basketballSvgToImage(shot.x, shot.y);
    const fromFeet = basketballImagePoint(23, 2 + 5.25);
    assert.ok(Math.abs(fromSvg.x - fromFeet.x) < 0.01);
    assert.ok(Math.abs(fromSvg.y - fromFeet.y) < 0.01);
  });

  it("puts the rim on the painted basket and a paint shot inside the lane", () => {
    // Orange rim centroid and left-key bounds measured on public/maps/basketball-court.png.
    near(imagePixel(25, 5.25), { x: 117, y: 285 }, 12);
    const paint = imagePixel(27, 7 + 5.25);
    assert.ok(paint.x > 79 && paint.x < 259, `paint x ${paint.x}`);
    assert.ok(paint.y > 213 && paint.y < 358, `paint y ${paint.y}`);
    const corner = imagePixel(3, 5 + 5.25);
    assert.ok(corner.y < 120, `corner three should sit on the sideline line, y=${corner.y}`);
    assert.ok(corner.x > 76 && corner.x < 250);
  });

  it("keeps offense at the bottom half and defense at the top half", () => {
    const offense = basketballImagePoint(25, 5.25);
    const defense = basketballImagePoint(25, 94 - 5.25);
    assert.ok(offense.y > BASKETBALL_COURT_IMAGE.width / 2);
    assert.ok(defense.y < BASKETBALL_COURT_IMAGE.width / 2);
    assert.equal(basketballCourtViewBox("full"), `0 0 ${BASKETBALL_COURT_IMAGE.height} ${BASKETBALL_COURT_IMAGE.width}`);
    assert.match(basketballCourtViewBox("offense"), /^0 512 /);
    assert.match(basketballCourtViewBox("defense"), /^0 0 /);
  });

  it("renders the court photo behind markers in every view", () => {
    const model: NbaShotChartModel = {
      playerId: "p",
      selectedSeason: "202425",
      seasonLabel: "2024-25",
      seasons: [],
      attempts: 1,
      made: 1,
      fgPct: null,
      trackedGames: 1,
      zones: BASKETBALL_SHOT_ZONES.map((zone) => ({
        zone,
        label: ZONE_LABELS[zone],
        attempts: zone === "restricted_area" ? 1 : 0,
        made: zone === "restricted_area" ? 1 : 0,
        fgPct: null,
        fill: "#d4d4d8",
        ink: "#d4d4d8",
      })),
      shots: [{ x: 23, y: 2, made: true, zone: "restricted_area" }],
      defense: [{ x: 25, y: 4, kind: "steal" }],
      steals: 1,
      blocks: 0,
    };
    for (const view of ["offense", "defense", "full"] as const) {
      const html = renderToStaticMarkup(createElement(NbaShotChart, { model, view }));
      assert.match(html, /href="\/maps\/basketball-court\.png"/);
      assert.match(html, new RegExp(`data-court-view="${view}"`));
    }
  });
});
