import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SoccerShotChart } from "@/features/scouting/components/profile/soccer-shot-chart";
import type { SoccerShotChartModel } from "@/features/scouting/queries/soccer-shot-chart";
import { pitchMarker } from "@/lib/soccer/pitch-geometry";
import { SOCCER_SHOT_ZONES, SOCCER_ZONE_LABELS } from "@/lib/soccer/shot-zones";
import {
  SOCCER_PITCH_IMAGE,
  SOCCER_PITCH_SURFACE,
  soccerImagePoint,
  soccerPitchViewBox,
  soccerSvgToImage,
} from "@/lib/soccer/pitch-image";

function imagePixel(x: number, y: number) {
  const display = soccerImagePoint(x, y);
  return { x: SOCCER_PITCH_IMAGE.width - display.y, y: display.x };
}

function near(actual: { x: number; y: number }, expected: { x: number; y: number }, px: number) {
  assert.ok(
    Math.hypot(actual.x - expected.x, actual.y - expected.y) <= px,
    `expected (${expected.x}, ${expected.y}) ±${px}, got (${actual.x.toFixed(1)}, ${actual.y.toFixed(1)})`
  );
}

describe("soccer pitch image coordinates", () => {
  it("uses the same map for the half-pitch drawing and the stored percents", () => {
    const shot = pitchMarker(89.5, 50);
    const fromSvg = soccerSvgToImage(shot.x, shot.y);
    const fromPercent = soccerImagePoint(89.5, 50);
    assert.ok(Math.abs(fromSvg.x - fromPercent.x) < 0.05);
    assert.ok(Math.abs(fromSvg.y - fromPercent.y) < 0.05);
  });

  it("puts the goal line, penalty spot, and six-yard box on the painted marks", () => {
    // Measured on public/maps/soccer-pitch.png. The right goal is the attacking goal.
    near(imagePixel(100, 50), { x: SOCCER_PITCH_SURFACE.rightGoal, y: 285.5 }, 1);
    near(imagePixel(50, 50), { x: 511.5, y: 285.5 }, 1);
    const spotX = 100 - (11 / 105) * 100;
    near(imagePixel(spotX, 50), { x: 821, y: 285.5 }, 4);
    const sixX = 100 - (5.5 / 105) * 100;
    near(imagePixel(sixX, 50 - (9.16 / 68) * 100), { x: 862, y: 217 }, 8);
    near(imagePixel(sixX, 50 + (9.16 / 68) * 100), { x: 862, y: 354 }, 8);
    const boxX = 100 - (16.5 / 105) * 100;
    near(imagePixel(boxX, 50), { x: 781, y: 285.5 }, 4);
  });

  it("keeps the goal at the top of the attacking half", () => {
    const goal = soccerImagePoint(100, 50);
    const halfway = soccerImagePoint(50, 50);
    assert.ok(goal.y < halfway.y);
    assert.match(soccerPitchViewBox(), /^0 0 572 /);
    assert.ok(goal.y < Number(soccerPitchViewBox().split(" ")[3]));
    assert.ok(halfway.y < Number(soccerPitchViewBox().split(" ")[3]) + 2);
  });

  it("renders the pitch photo behind the markers", () => {
    const model: SoccerShotChartModel = {
      selectedSeason: "2026",
      seasonLabel: "2026",
      seasons: [],
      attempts: 1,
      converted: 1,
      conversionPct: null,
      trackedGames: 1,
      zones: SOCCER_SHOT_ZONES.map((zone) => ({
        zone,
        label: SOCCER_ZONE_LABELS[zone],
        attempts: zone === "penalty_area" ? 1 : 0,
        converted: zone === "penalty_area" ? 1 : 0,
        conversionPct: null,
        fill: "#d4d4d8",
        ink: "#d4d4d8",
      })),
      shots: [{ x: 89.5, y: 50, converted: true, zone: "penalty_area" }],
    };
    const html = renderToStaticMarkup(
      createElement(SoccerShotChart, { model, coverage: "Map reflects 1 tracked game." })
    );
    assert.match(html, /href="\/maps\/soccer-pitch\.png"/);
    assert.match(html, /GOAL/);
    const compare = renderToStaticMarkup(
      createElement(SoccerShotChart, { model, coverage: "", pitchOnly: true })
    );
    assert.match(compare, /href="\/maps\/soccer-pitch\.png"/);
  });
});
