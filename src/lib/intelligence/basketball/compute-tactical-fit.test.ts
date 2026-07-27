import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildBasketballIntelligenceProfile } from "@/lib/intelligence/basketball/build-basketball-intelligence-profile";
import { computeBasketballTacticalFit } from "@/lib/intelligence/basketball/compute-tactical-fit";
import { buildBasketballTeamStyleProfile } from "@/lib/intelligence/basketball/team-style-profile";
import type { Player, PlayerStatistic, TeamStatistic } from "@/types";

function bbPlayer(overrides: Partial<PlayerStatistic> = {}): Player {
  const currentSeasonStats: PlayerStatistic = {
    id: "s1",
    playerId: "p1",
    teamId: "t1",
    season: "2025",
    sport: "BASKETBALL",
    appearances: 40,
    minutesPlayed: 1200,
    goals: 0,
    assists: 7,
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
    rating: 7.6,
    points: 18,
    rebounds: 5,
    steals: 1.2,
    blocks: 0.4,
    fieldGoalsPercent: 46,
    threePointsPercent: 38,
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

  return {
    id: "p1",
    fullName: "Test Guard",
    knownAs: "Guard",
    dateOfBirth: "1999-01-01",
    age: 26,
    nationality: "USA",
    position: "PG",
    height: 190,
    weight: 88,
    preferredFoot: "RIGHT",
    marketValue: 0,
    sport: "BASKETBALL",
    league: "NBA",
    teamId: "t1",
    strengths: [],
    weaknesses: [],
    currentSeasonStats,
    availableSeasons: ["2025"],
    selectedSeason: "2025",
    history: [currentSeasonStats],
  };
}

function teamStats(overrides: Partial<TeamStatistic> = {}): TeamStatistic {
  return {
    id: "ts1",
    teamId: "t1",
    season: "2025",
    matchesPlayed: 40,
    wins: 28,
    draws: 0,
    losses: 12,
    goalsFor: 4600,
    goalsAgainst: 4400,
    xG: 0,
    xGA: 0,
    possessionPct: 0,
    passAccuracyPct: 0,
    pressuresPer90: 0,
    attackRating: 0,
    defenseRating: 0,
    ...overrides,
  };
}

describe("buildBasketballTeamStyleProfile", () => {
  it("labels high-scoring teams as pace & space", () => {
    const style = buildBasketballTeamStyleProfile(
      teamStats({ goalsFor: 5000, goalsAgainst: 4300, wins: 30 })
    );
    assert.equal(style.archetype, "pace_space");
    assert.ok(style.offenseIndex > style.defenseIndex || style.offenseIndex >= 65);
  });
});

describe("computeBasketballTacticalFit", () => {
  it("returns a bounded fit score with reasons and limitations", () => {
    const player = bbPlayer();
    const profile = buildBasketballIntelligenceProfile(player);
    const fit = computeBasketballTacticalFit(
      profile,
      buildBasketballTeamStyleProfile(teamStats()),
      "Demo Club"
    );

    assert.ok(fit.fitScore >= 0 && fit.fitScore <= 100);
    assert.ok(fit.reasons.length >= 2);
    assert.ok(fit.limitations.length >= 1);
    assert.equal(fit.teamName, "Demo Club");
  });
});
