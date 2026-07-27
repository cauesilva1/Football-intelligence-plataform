import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildScoutBriefContext } from "@/lib/export/scout-brief-context";
import type { Player } from "@/types";

function soccerPlayer(overrides: Partial<Player["currentSeasonStats"]> = {}): Player {
  const currentSeasonStats = {
    id: "stat-1",
    playerId: "p1",
    teamId: "t1",
    season: "2025",
    sport: "SOCCER" as const,
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
    ...overrides,
  };

  return {
    id: "p1",
    fullName: "Test Striker",
    knownAs: "Striker",
    dateOfBirth: "2003-01-01",
    position: "ST",
    age: 22,
    height: 180,
    weight: 75,
    preferredFoot: "RIGHT",
    sport: "SOCCER",
    teamId: "t1",
    teamName: "Club",
    teamShortName: "CLB",
    nationality: "BR",
    marketValue: 1_000_000,
    currentSeasonStats,
    strengths: [],
    weaknesses: [],
    availableSeasons: ["2025"],
    selectedSeason: "2025",
    history: [currentSeasonStats],
  };
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

  it("includes soccer intelligence snapshot aligned with profile engine", () => {
    const ctx = buildScoutBriefContext(soccerPlayer());
    assert.ok(ctx.intelligence);
    assert.ok(ctx.intelligence?.role.length);
    assert.equal(ctx.intelligence?.dimensions.length, 4);
    assert.ok(ctx.keyRates.some((line) => line.includes("Role:")));
  });
});
