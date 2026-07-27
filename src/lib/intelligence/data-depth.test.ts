import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  countProductiveSeasons,
  dataDepthLimitationLines,
  deriveDataDepthSnapshot,
  isProductiveSeasonRow,
  seasonProductivityFloor,
} from "@/lib/intelligence/data-depth";
import type { Player, PlayerStatistic } from "@/types";

function stat(overrides: Partial<PlayerStatistic> = {}): PlayerStatistic {
  return {
    id: "s1",
    playerId: "p1",
    teamId: "t1",
    season: "2025",
    sport: "BASKETBALL",
    appearances: 40,
    minutesPlayed: 1200,
    goals: 0,
    assists: 0,
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
    rating: 7,
    points: 12,
    rebounds: 4,
    steals: 1,
    blocks: 0,
    fieldGoalsPercent: 45,
    threePointsPercent: 35,
    per90: {
      goals: 0,
      assists: 0,
      shots: 0,
      keyPasses: 0,
      dribbles: 0,
      tackles: 0,
      interceptions: 0,
    },
    ...overrides,
  };
}

function player(history: PlayerStatistic[], current = history[0]): Player {
  return {
    id: "p1",
    fullName: "Depth Test",
    knownAs: "Depth",
    dateOfBirth: "1998-01-01",
    age: 27,
    nationality: "USA",
    position: "PG",
    height: 190,
    weight: 85,
    preferredFoot: "RIGHT",
    marketValue: 0,
    teamId: "t1",
    sport: "BASKETBALL",
    league: "NBA",
    strengths: [],
    weaknesses: [],
    currentSeasonStats: current ?? stat({ appearances: 0, minutesPlayed: 0, points: 0 }),
    availableSeasons: history.map((row) => row.season),
    selectedSeason: (current ?? history[0])?.season,
    history,
  };
}

describe("data-depth", () => {
  it("exposes sport-native productivity floors", () => {
    assert.deepEqual(seasonProductivityFloor("BASKETBALL"), {
      minAppearances: 8,
      minMinutes: 150,
    });
    assert.deepEqual(seasonProductivityFloor("AMERICAN_FOOTBALL"), {
      minAppearances: 4,
      minMinutes: 200,
    });
    assert.deepEqual(seasonProductivityFloor("SOCCER"), {
      minAppearances: 4,
      minMinutes: 270,
    });
  });

  it("treats stubs as non-productive", () => {
    assert.equal(isProductiveSeasonRow(2, 40, "BASKETBALL"), false);
    assert.equal(isProductiveSeasonRow(10, 200, "BASKETBALL"), true);
  });

  it("counts productive seasons across history", () => {
    const history = [
      stat({ season: "2024", appearances: 2, minutesPlayed: 40 }),
      stat({ season: "2025", appearances: 30, minutesPlayed: 900 }),
      stat({ season: "2023", appearances: 25, minutesPlayed: 800 }),
    ];
    assert.equal(countProductiveSeasons(history, "BASKETBALL"), 2);
  });

  it("flags single-season depth honestly", () => {
    const snapshot = deriveDataDepthSnapshot(
      player([stat({ season: "2025", appearances: 30, minutesPlayed: 900 })])
    );
    assert.equal(snapshot.gapKind, "single_season");
    assert.equal(snapshot.trajectoryEligible, false);
    assert.ok(dataDepthLimitationLines(player([stat()])).length === 1);
  });

  it("marks roster-only players as data gap", () => {
    const snapshot = deriveDataDepthSnapshot(
      player([], stat({ appearances: 0, minutesPlayed: 0, points: 0 }))
    );
    assert.equal(snapshot.gapKind, "no_history");
    assert.equal(snapshot.label, "Data gap");
  });
});
