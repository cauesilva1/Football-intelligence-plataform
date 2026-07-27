import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildLeaguePositionPercentileTable,
  clearLeaguePercentileCacheForTests,
  computeLeaguePositionPercentiles,
  lookupPlayerPercentileScores,
  percentileRank,
} from "@/lib/intelligence/soccer/league-percentiles";
import type { Player, PlayerStatistic } from "@/types";

function stat(id: string, goals: number, assists: number, keyPasses: number): PlayerStatistic {
  return {
    id,
    playerId: id,
    teamId: "t1",
    season: "2025/26",
    sport: "SOCCER",
    appearances: 20,
    minutesPlayed: 900,
    goals,
    assists,
    xG: goals * 0.8,
    xA: assists * 0.7,
    shots: goals * 4,
    shotsOnTarget: goals * 2,
    passes: 400,
    passAccuracy: 80,
    keyPasses,
    dribblesCompleted: 20,
    tacklesWon: 30,
    interceptions: 20,
    duelsWonPct: 55,
    yellowCards: 1,
    redCards: 0,
    rating: 7,
    per90: {
      goals: (goals / 900) * 90,
      assists: (assists / 900) * 90,
      shots: 2,
      keyPasses: (keyPasses / 900) * 90,
      dribbles: 2,
      tackles: 3,
      interceptions: 2,
    },
  };
}

function player(id: string, goals: number, assists: number, keyPasses: number): Player {
  const currentSeasonStats = stat(id, goals, assists, keyPasses);
  return {
    id,
    fullName: id,
    knownAs: id,
    dateOfBirth: "2000-01-01",
    age: 24,
    nationality: "BR",
    position: "ST",
    height: 180,
    weight: 75,
    preferredFoot: "RIGHT",
    marketValue: 1_000_000,
    sport: "SOCCER",
    league: "liga-test",
    teamId: "t1",
    strengths: [],
    weaknesses: [],
    currentSeasonStats,
    availableSeasons: ["2025/26"],
    selectedSeason: "2025/26",
    history: [currentSeasonStats],
  };
}

describe("percentileRank", () => {
  it("returns ~50 for the median value", () => {
    const dist = [1, 2, 3, 4, 5];
    assert.ok(percentileRank(3, dist) >= 40 && percentileRank(3, dist) <= 60);
  });

  it("returns higher ranks for top values", () => {
    const dist = [10, 20, 30, 40, 50, 60, 70, 80];
    assert.ok(percentileRank(80, dist) > percentileRank(20, dist));
  });
});

describe("buildLeaguePositionPercentileTable", () => {
  it("requires a minimum cohort size", () => {
    const cohort = Array.from({ length: 5 }, (_, index) =>
      player(`p${index}`, index, 1, 10)
    );
    const table = buildLeaguePositionPercentileTable(cohort, {
      sport: "SOCCER",
      league: "liga-test",
      position: "ST",
      season: "2025/26",
    });
    assert.equal(table, null);
  });

  it("ranks a top producer above a low producer", () => {
    const cohort = [
      player("p1", 2, 1, 10),
      player("p2", 4, 2, 15),
      player("p3", 6, 2, 18),
      player("p4", 8, 3, 20),
      player("p5", 10, 3, 22),
      player("p6", 12, 4, 25),
      player("p7", 14, 4, 28),
      player("p8", 16, 5, 30),
      player("p9", 18, 6, 35),
    ];

    const table = buildLeaguePositionPercentileTable(cohort, {
      sport: "SOCCER",
      league: "liga-test",
      position: "ST",
      season: "2025/26",
    });
    assert.ok(table);
    assert.equal(table.cohortSize, 9);

    const top = lookupPlayerPercentileScores(player("p9", 18, 6, 35), table)!;
    const low = lookupPlayerPercentileScores(player("p1", 2, 1, 10), table)!;
    assert.ok(top.production > low.production);
    assert.ok(top.creation > low.creation);
  });
});

describe("computeLeaguePositionPercentiles", () => {
  it("caches tables in memory for repeated calls", async () => {
    clearLeaguePercentileCacheForTests();
    const cohort = Array.from({ length: 10 }, (_, index) =>
      player(`c${index}`, index + 1, 1, 10 + index)
    );

    const first = await computeLeaguePositionPercentiles("SOCCER", "liga-test", "ST", {
      season: "2025/26",
      cohort,
    });
    const second = await computeLeaguePositionPercentiles("SOCCER", "liga-test", "ST", {
      season: "2025/26",
      cohort: [],
    });

    assert.ok(first);
    assert.equal(second?.builtAt, first?.builtAt);
    assert.equal(second?.cohortSize, 10);
  });
});
