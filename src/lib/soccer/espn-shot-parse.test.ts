import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isSoccerShotEventType,
  parseSoccerShotPlay,
  shooterNameFromPlayText,
} from "@/lib/soccer/espn-shot-parse";

describe("espn soccer shot parse", () => {
  it("keeps finalizations and drops goal kicks and assists", () => {
    assert.equal(isSoccerShotEventType("shot-on-target"), true);
    assert.equal(isSoccerShotEventType("shot-blocked"), true);
    assert.equal(isSoccerShotEventType("goal---volley"), true);
    assert.equal(isSoccerShotEventType("penalty---scored"), true);
    assert.equal(isSoccerShotEventType("goal-kick"), false);
    assert.equal(isSoccerShotEventType("assists-shot"), false);
    assert.equal(isSoccerShotEventType("blocked-pass"), false);
  });

  it("stores a real MLS shot and refuses a null coordinate", () => {
    const saved = parseSoccerShotPlay({
      id: "1",
      type: { type: "shot-on-target", text: "Shot On Target" },
      scoringPlay: false,
      fieldPositionX: 70,
      fieldPositionY: 64.6,
      fieldPosition2X: 98.9,
      participants: [{ athlete: { $ref: "http://sports.core.api.espn.com/v2/sports/soccer/leagues/usa.1/athletes/12345" } }],
    });
    assert.equal(typeof saved, "object");
    if (typeof saved !== "object") return;
    assert.equal(saved.converted, true);
    assert.equal(saved.zone, "outside_box");
    assert.equal(saved.espnAthleteId, "12345");

    const missing = parseSoccerShotPlay({
      id: "2",
      type: { type: "assists-shot" },
      fieldPositionX: null,
      fieldPositionY: null,
      participants: [{ athlete: { id: "9" } }],
    });
    assert.equal(missing, "not-a-shot");

    const nullPoint = parseSoccerShotPlay({
      id: "3",
      type: { type: "shot-off-target" },
      fieldPositionX: null,
      fieldPositionY: null,
      participants: [{ athlete: { id: "9" } }],
    });
    assert.equal(nullPoint, "invalid");
  });

  it("counts a goal as converted and a woodwork shot as not", () => {
    const goal = parseSoccerShotPlay({
      id: "4",
      type: { type: "goal---free-kick" },
      scoringPlay: true,
      fieldPositionX: 93.2,
      fieldPositionY: 12.8,
      fieldPosition2X: 100,
      participants: [{ athlete: { id: "45843" } }],
    });
    assert.equal(typeof goal === "object" && goal.converted, true);
    assert.equal(typeof goal === "object" && goal.zone, "left_side");

    const wood = parseSoccerShotPlay({
      id: "5",
      type: { type: "shot-hit-woodwork" },
      scoringPlay: false,
      fieldPositionX: 86.8,
      fieldPositionY: 72.7,
      fieldPosition2X: 100,
      participants: [{ athlete: { id: "1" } }],
    });
    assert.equal(typeof wood === "object" && wood.converted, false);
    assert.equal(typeof wood === "object" && wood.zone, "penalty_area");
  });

  it("reads the shooter from the play text and scales 0–1 coordinates", () => {
    assert.equal(
      shooterNameFromPlayText(
        "Goal! Columbus Crew 1, Inter Miami CF 1. Lionel Messi (Inter Miami CF) from a free kick."
      ),
      "Lionel Messi"
    );
    assert.equal(
      shooterNameFromPlayText(
        "Attempt missed. Malik Henry (Toronto FC) left footed shot from outside the box is close."
      ),
      "Malik Henry"
    );
    const fraction = parseSoccerShotPlay({
      id: "7",
      type: { type: "shot-off-target" },
      text: "Attempt missed. Malik Henry (Toronto FC) left footed shot from outside the box.",
      fieldPositionX: 0.43,
      fieldPositionY: 0.626,
      fieldPosition2X: 1,
      participants: [{ athlete: { id: "308639" } }],
    });
    assert.equal(typeof fraction === "object" && fraction.zone, "outside_box");
    assert.equal(typeof fraction === "object" && Math.round(fraction.x), 43);
    assert.equal(typeof fraction === "object" && fraction.shooterName, "Malik Henry");
  });

  it("skips own goals", () => {
    const own = parseSoccerShotPlay({
      id: "6",
      type: { type: "goal---header" },
      ownGoal: true,
      scoringPlay: true,
      fieldPositionX: 95,
      fieldPositionY: 50,
      participants: [{ athlete: { id: "1" } }],
    });
    assert.equal(own, "not-a-shot");
  });
});
