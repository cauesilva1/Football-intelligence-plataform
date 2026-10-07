import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  espnNbaEventId,
  espnSummaryHasShotCoordinates,
  parseEspnBasketballShots,
} from "@/lib/basketball/espn-shot-parse";

/** Trimmed from the live summary of event 401898388 (MEM @ ATL, 2026-10-05). */
const SUMMARY = {
  plays: [
    {
      id: "jb",
      shootingPlay: false,
      coordinate: { x: -214748340, y: -214748365 },
      type: { text: "Jumpball" },
      text: "Jump ball",
    },
    {
      id: "layup",
      shootingPlay: true,
      scoringPlay: true,
      pointsAttempted: 2,
      coordinate: { x: 24, y: 1 },
      type: { text: "Driving Layup Shot" },
      participants: [{ athlete: { id: "4065733" } }],
    },
    {
      id: "wing3",
      shootingPlay: true,
      scoringPlay: true,
      pointsAttempted: 3,
      coordinate: { x: 48, y: 12 },
      type: { text: "Jump Shot" },
      participants: [{ athlete: { id: "4278039" } }, { athlete: { id: "4869342" } }],
    },
    {
      id: "corner3",
      shootingPlay: true,
      scoringPlay: false,
      pointsAttempted: 3,
      coordinate: { x: 1, y: 6 },
      type: { text: "Jump Shot" },
      participants: [{ athlete: { id: "4065733" } }],
    },
    {
      id: "ft",
      shootingPlay: true,
      scoringPlay: true,
      pointsAttempted: 1,
      coordinate: { x: -214748340, y: -214748365 },
      type: { text: "Free Throw - 1 of 2" },
      participants: [{ athlete: { id: "4065733" } }],
    },
    {
      id: "blocked",
      shootingPlay: true,
      scoringPlay: false,
      pointsAttempted: 2,
      coordinate: { x: 24, y: 1 },
      type: { text: "Layup Shot" },
      text: "blocks a 1-foot layup",
      participants: [{ athlete: { id: "4593016" } }],
    },
  ],
};

describe("ESPN shot coordinate parsing", () => {
  it("reads court field goals and drops free throws with sentinel coordinates", () => {
    const parsed = parseEspnBasketballShots(SUMMARY);
    assert.equal(parsed.coordinatesAvailable, true);
    assert.equal(parsed.skippedFreeThrow, 1);
    assert.equal(parsed.skippedInvalidCoordinate, 0);
    assert.deepEqual(
      parsed.shots.map((shot) => ({
        id: shot.externalPlayId,
        athlete: shot.espnAthleteId,
        zone: shot.zone,
        made: shot.made,
        shotType: shot.shotType,
        x: shot.x,
        y: shot.y,
      })),
      [
        {
          id: "layup",
          athlete: "4065733",
          zone: "restricted_area",
          made: true,
          shotType: "Driving Layup Shot",
          x: 24,
          y: 1,
        },
        {
          id: "wing3",
          athlete: "4278039",
          zone: "above_the_break_3",
          made: true,
          shotType: "Jump Shot",
          x: 48,
          y: 12,
        },
        {
          id: "corner3",
          athlete: "4065733",
          zone: "corner_3",
          made: false,
          shotType: "Jump Shot",
          x: 1,
          y: 6,
        },
        {
          id: "blocked",
          athlete: "4593016",
          zone: "restricted_area",
          made: false,
          shotType: "Layup Shot",
          x: 24,
          y: 1,
        },
      ]
    );
  });

  it("skips a field goal whose coordinate is the sentinel instead of placing it", () => {
    const parsed = parseEspnBasketballShots({
      plays: [
        {
          id: "bad",
          shootingPlay: true,
          scoringPlay: false,
          pointsAttempted: 2,
          coordinate: { x: -214748340, y: -214748365 },
          type: { text: "Jump Shot" },
          participants: [{ athlete: { id: "1" } }],
        },
      ],
    });
    assert.equal(parsed.coordinatesAvailable, true);
    assert.equal(parsed.shots.length, 0);
    assert.equal(parsed.skippedInvalidCoordinate, 1);
  });

  it("reports coordinates unavailable when the summary has no coordinate field", () => {
    const summary = { plays: [{ id: "1", shootingPlay: true, pointsAttempted: 2, text: "makes layup" }] };
    assert.equal(espnSummaryHasShotCoordinates(summary), false);
    const parsed = parseEspnBasketballShots(summary);
    assert.equal(parsed.coordinatesAvailable, false);
    assert.equal(parsed.shots.length, 0);
    assert.equal(espnSummaryHasShotCoordinates({ plays: [] }), false);
    assert.equal(espnSummaryHasShotCoordinates({}), false);
  });

  it("reads only NBA event ids out of appearance keys", () => {
    assert.equal(espnNbaEventId("espn:nba:401898388"), "401898388");
    assert.equal(espnNbaEventId("espn:nba-summer:401898388"), null);
    assert.equal(espnNbaEventId("espn:mens-college-basketball:1"), null);
  });
});
