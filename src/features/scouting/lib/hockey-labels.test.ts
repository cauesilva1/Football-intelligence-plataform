import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { HOCKEY_FILTER_LABELS } from "@/features/scouting/lib/constants";
import { derivePlayerStatus } from "@/features/scouting/lib/player-status";
import { playingStyleForProfile } from "@/features/scouting/lib/playing-style";
import { similarHockeyPositionGroup } from "@/features/scouting/lib/position-scorecard";
import {
  formatHockeyPositionLabel,
  formatHockeyShootsLabel,
} from "@/lib/positions";
import { getPositionAbbreviation } from "@/lib/team-theme";
import type { Player, PlayerStatistic } from "@/types";

function hockeyStats(appearances: number): PlayerStatistic {
  return {
    id: "s",
    playerId: "p",
    teamId: "t",
    season: "202627",
    sport: "HOCKEY",
    appearances,
    minutesPlayed: appearances * 1051,
    goals: 2,
    assists: 3,
    xG: 0,
    xA: 0,
    shots: 0,
    shotsOnTarget: 0,
    passes: 0,
    passAccuracy: 0,
    keyPasses: 0,
    dribblesCompleted: 0,
    tacklesWon: 0,
    interceptions: 0,
    duelsWonPct: 0,
    yellowCards: 0,
    redCards: 0,
    rating: 6.4,
    per90: {
      goals: 2,
      assists: 3,
      shots: 0,
      keyPasses: 5,
      dribbles: 0,
      tackles: 0,
      interceptions: 0,
    },
  };
}

describe("hockey display labels", () => {
  it("keeps NHL position codes and drops soccer ones", () => {
    assert.equal(formatHockeyPositionLabel("LW"), "LW");
    assert.equal(formatHockeyPositionLabel("R"), "RW");
    assert.equal(formatHockeyPositionLabel("C"), "C");
    assert.equal(formatHockeyPositionLabel("G"), "G");
    assert.equal(formatHockeyPositionLabel("ST"), "—");
    assert.equal(formatHockeyPositionLabel("CDM"), "—");
    assert.equal(formatHockeyPositionLabel("FW"), "—");
    assert.equal(getPositionAbbreviation("LW", "HOCKEY"), "LW");
    assert.equal(getPositionAbbreviation("RW", "HOCKEY"), "RW");
    assert.equal(getPositionAbbreviation("LW"), "FW");
  });

  it("groups similar skaters without soccer positions", () => {
    const forwards = similarHockeyPositionGroup("C");
    assert.deepEqual(forwards, ["C", "LW", "RW"]);
    assert.equal(forwards.includes("CDM"), false);
    assert.equal(forwards.includes("ST"), false);
    assert.equal(forwards.includes("FW"), false);
    assert.deepEqual(similarHockeyPositionGroup("D"), ["D"]);
    assert.deepEqual(similarHockeyPositionGroup("G"), ["G"]);
  });

  it("speaks stick side and games, not foot or soccer minutes", () => {
    assert.equal(formatHockeyShootsLabel("LEFT"), "Shoots L");
    assert.equal(formatHockeyShootsLabel("RIGHT"), "Shoots R");
    assert.equal(formatHockeyShootsLabel("BOTH"), null);
    const status = derivePlayerStatus(hockeyStats(3), "HOCKEY");
    assert.match(status.description, /games/i);
    assert.doesNotMatch(status.description, /450|foot|per 90/i);
  });

  it("hides the skater playing-style block on hockey profiles", () => {
    const goalie = playingStyleForProfile({ sport: "HOCKEY", position: "G" } as Player);
    const wing = playingStyleForProfile({ sport: "HOCKEY", position: "LW" } as Player);
    assert.equal(goalie, null);
    assert.equal(wing, null);
  });

  it("names hockey counting filters, not per-90 rates", () => {
    const labels = Object.values(HOCKEY_FILTER_LABELS).join(" ");
    assert.match(labels, /goals/i);
    assert.match(labels, /assists/i);
    assert.match(labels, /points/i);
    assert.doesNotMatch(labels, /90|xG|foot/i);
  });
});
