import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  reliableSoccerRating,
  soccerValueScore,
  passesSoccerTopProspect,
  passesSoccerHiddenGem,
} from "@/lib/scoring/soccer-rankings";
import type { Player } from "@/types";

function basePlayer(overrides: {
  age?: number;
  minutes?: number;
  rating?: number;
  goals?: number;
  marketValue?: number;
}): Player {
  const minutes = overrides.minutes ?? 900;
  const rating = overrides.rating ?? 7.5;
  const goals = overrides.goals ?? 5;
  const stats = {
    id: "s1",
    playerId: "p1",
    teamId: "t1",
    season: "2025/26",
    appearances: 20,
    minutesPlayed: minutes,
    goals,
    assists: 2,
    xG: 4,
    xA: 1,
    shots: 20,
    shotsOnTarget: 8,
    passes: 400,
    passAccuracy: 80,
    keyPasses: 10,
    dribblesCompleted: 5,
    tacklesWon: 10,
    interceptions: 8,
    duelsWonPct: 50,
    yellowCards: 0,
    redCards: 0,
    rating,
    per90: {
      goals: 0.5,
      assists: 0.2,
      shots: 2,
      keyPasses: 1,
      dribbles: 0.5,
      tackles: 1,
      interceptions: 0.8,
    },
    sport: "SOCCER" as const,
  };

  return {
    id: "p1",
    fullName: "Test Player",
    knownAs: "Test",
    dateOfBirth: "2004-01-01",
    age: overrides.age ?? 21,
    nationality: "Brazil",
    position: "CM",
    height: 180,
    weight: 75,
    preferredFoot: "RIGHT",
    marketValue: overrides.marketValue ?? 5_000_000,
    photoUrl: undefined,
    sport: "SOCCER",
    league: "Serie A",
    teamId: "t1",
    strengths: [],
    weaknesses: [],
    currentSeasonStats: stats,
    availableSeasons: ["2025/26"],
    selectedSeason: "2025/26",
    history: [stats],
  };
}

describe("reliableSoccerRating", () => {
  it("caps tiny samples below elite ratings", () => {
    const rating = reliableSoccerRating({
      minutesPlayed: 3,
      goals: 0,
      assists: 0,
      rating: 9.5,
    });
    assert.ok(rating <= 7);
  });

  it("keeps rate-based rating for reliable samples", () => {
    const rating = reliableSoccerRating({
      minutesPlayed: 900,
      goals: 10,
      assists: 5,
      rating: 7.2,
    });
    assert.ok(rating >= 6.5);
    assert.ok(rating <= 10);
  });

  it("damps stored 9.5 when rates imply mediocre output", () => {
    const rating = reliableSoccerRating({
      minutesPlayed: 900,
      goals: 0,
      assists: 0,
      rating: 9.5,
    });
    assert.ok(rating < 7.5);
  });
});

describe("soccerValueScore", () => {
  it("ranks cheaper players higher for the same rating", () => {
    const cheap = soccerValueScore(7.5, 2_000_000);
    const expensive = soccerValueScore(7.5, 20_000_000);
    assert.ok(cheap > expensive);
  });
});

describe("passesSoccerTopProspect", () => {
  it("rejects under-minutes players even with high rating", () => {
    const player = basePlayer({ age: 20, minutes: 3, rating: 9.5 });
    assert.equal(passesSoccerTopProspect(player), false);
  });

  it("accepts U23 with rating and minutes", () => {
    const player = basePlayer({ age: 21, minutes: 900, rating: 7.5 });
    assert.equal(passesSoccerTopProspect(player), true);
  });
});

describe("passesSoccerHiddenGem", () => {
  it("rejects players above value cap", () => {
    const player = basePlayer({
      age: 24,
      minutes: 900,
      rating: 7.5,
      marketValue: 15_000_000,
    });
    assert.equal(passesSoccerHiddenGem(player), false);
  });

  it("accepts affordable strong performers", () => {
    const player = basePlayer({
      age: 24,
      minutes: 900,
      rating: 7.5,
      marketValue: 4_000_000,
    });
    assert.equal(passesSoccerHiddenGem(player), true);
  });
});
