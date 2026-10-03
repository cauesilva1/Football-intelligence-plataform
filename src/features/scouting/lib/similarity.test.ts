import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { findSimilarPlayers } from "@/features/scouting/lib/similarity";
import type { Player, PlayerStatistic } from "@/types";

function afStats(id: string, games: number): PlayerStatistic {
  return {
    id: `s-${id}`,
    playerId: id,
    teamId: "t",
    season: "2025",
    sport: "AMERICAN_FOOTBALL",
    appearances: games,
    minutesPlayed: games * 60,
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
    rating: 0,
    per90: {
      goals: 0,
      assists: 0,
      shots: 0,
      keyPasses: 0,
      dribbles: 0,
      tackles: 0,
      interceptions: 0,
    },
  };
}

function afPlayer(id: string, games: number): Player {
  const current = afStats(id, games);
  return {
    id,
    fullName: id,
    knownAs: id,
    dateOfBirth: "2000-01-01",
    age: 25,
    nationality: "USA",
    position: "WR",
    height: 185,
    weight: 90,
    preferredFoot: "RIGHT",
    marketValue: 0,
    teamId: "t1",
    sport: "AMERICAN_FOOTBALL",
    league: "NFL",
    strengths: [],
    weaknesses: [],
    currentSeasonStats: current,
    availableSeasons: [current.season],
    selectedSeason: current.season,
    history: [current],
  };
}

describe("findSimilarPlayers", () => {
  it("does not report a match for a candidate with no games", () => {
    const target = afPlayer("target", 12);
    const results = findSimilarPlayers(target, [afPlayer("idle", 0), afPlayer("active", 10)]);
    const idle = results.find((entry) => entry.player.id === "idle");
    assert.ok(idle);
    assert.equal(idle.comparable, false);
    assert.equal(results[0]?.player.id, "active");
    assert.equal(results[0]?.comparable, true);
  });

  it("marks every candidate non-comparable when the target has no games", () => {
    const results = findSimilarPlayers(afPlayer("target", 0), [afPlayer("active", 10)]);
    assert.equal(results[0]?.comparable, false);
  });
});
