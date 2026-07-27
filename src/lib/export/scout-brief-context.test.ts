import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildScoutBriefContext } from "@/lib/export/scout-brief-context";
import type { Player } from "@/types";

function soccerPlayer(overrides: Partial<Player["currentSeasonStats"]> = {}): Player {
  return {
    id: "p1",
    fullName: "Test Striker",
    knownAs: "Striker",
    position: "ST",
    age: 22,
    sport: "SOCCER",
    teamId: "t1",
    teamName: "Club",
    teamShortName: "CLB",
    nationality: "BR",
    marketValue: 1_000_000,
    capHit: null,
    currentSeasonStats: {
      season: "2025",
      appearances: 20,
      minutesPlayed: 900,
      goals: 12,
      assists: 4,
      shots: 40,
      shotsOnTarget: 22,
      keyPasses: 18,
      passes: 400,
      passAccuracy: 78,
      dribblesCompleted: 30,
      xG: 10.5,
      xA: 3.2,
      duelsWonPct: 52,
      tacklesWon: 8,
      interceptions: 5,
      yellowCards: 2,
      redCards: 0,
      rating: 7.8,
      per90: {
        goals: 1.2,
        assists: 0.4,
        shots: 4,
        keyPasses: 1.8,
        dribbles: 3,
        tackles: 0.8,
        interceptions: 0.5,
      },
      perGame: {},
      ...overrides,
    },
    strengths: [],
    weaknesses: [],
    selectedSeason: "2025",
    seasonHistory: [],
  } as unknown as Player;
}

describe("buildScoutBriefContext", () => {
  it("marks reliable soccer sample and includes attack rates", () => {
    const ctx = buildScoutBriefContext(soccerPlayer());
    assert.equal(ctx.smallSample, false);
    assert.equal(ctx.minutesPlayed, 900);
    assert.ok(ctx.keyRates.some((line) => line.includes("Goals")));
    assert.ok(ctx.keyRates.some((line) => line.includes("xG")));
  });

  it("marks small soccer sample", () => {
    const ctx = buildScoutBriefContext(soccerPlayer({ minutesPlayed: 200, appearances: 3 }));
    assert.equal(ctx.smallSample, true);
    assert.match(ctx.sampleNote, /Provisional/);
  });
});
