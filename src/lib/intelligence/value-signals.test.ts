import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { deriveAgePeerValueSignal } from "@/lib/intelligence/value-signals";
import type { Player, PlayerStatistic } from "@/types";

function stats(rating: number): PlayerStatistic {
  return {
    id: "s",
    playerId: "p",
    teamId: "t",
    season: "2025",
    sport: "SOCCER",
    appearances: 20,
    minutesPlayed: 1500,
    goals: 5,
    assists: 2,
    xG: 4,
    xA: 1,
    shots: 30,
    shotsOnTarget: 12,
    passes: 300,
    passAccuracy: 80,
    keyPasses: 10,
    dribblesCompleted: 5,
    tacklesWon: 4,
    interceptions: 3,
    duelsWonPct: 50,
    yellowCards: 0,
    redCards: 0,
    rating,
    per90: {
      goals: 0.3,
      assists: 0.12,
      shots: 1.8,
      keyPasses: 0.6,
      dribbles: 0.3,
      tackles: 0.2,
      interceptions: 0.2,
    },
  };
}

function makePlayer(
  id: string,
  age: number,
  rating: number,
  marketValue: number,
  overrides: Partial<Player> = {}
): Player {
  const current = { ...stats(rating), playerId: id };
  return {
    id,
    fullName: id,
    knownAs: id,
    dateOfBirth: "2000-01-01",
    age,
    nationality: "BRA",
    position: "ST",
    height: 180,
    weight: 75,
    preferredFoot: "RIGHT",
    marketValue,
    teamId: "t1",
    sport: "SOCCER",
    league: "Serie A",
    strengths: [],
    weaknesses: [],
    currentSeasonStats: current,
    availableSeasons: [current.season],
    selectedSeason: current.season,
    history: [current],
    ...overrides,
  };
}

describe("deriveAgePeerValueSignal", () => {
  it("flags soccer undervalued when value score beats age peers", () => {
    const target = makePlayer("star", 24, 7.8, 2_000_000);
    const cohort = [
      target,
      ...Array.from({ length: 12 }, (_, index) =>
        makePlayer(`p${index}`, 24, 7.2, 12_000_000)
      ),
    ];
    const signal = deriveAgePeerValueSignal(target, cohort);
    assert.equal(signal.kind, "undervalued");
    assert.ok(signal.label.toLowerCase().includes("undervalued"));
  });

  it("skips BB/AF when cap hit is missing", () => {
    const target = makePlayer("bb1", 24, 7.5, 0, {
      sport: "BASKETBALL",
      position: "PG",
      capHit: 0,
      league: "NBA",
    });
    const signal = deriveAgePeerValueSignal(target, [target]);
    assert.equal(signal.kind, "unavailable");
  });
});
