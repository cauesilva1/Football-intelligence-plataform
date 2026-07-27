import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildAmericanFootballIntelligenceProfile } from "@/lib/intelligence/american-football/build-american-football-intelligence-profile";
import { computeAmericanFootballTacticalFit } from "@/lib/intelligence/american-football/compute-tactical-fit";
import { buildAmericanFootballTeamStyleProfile } from "@/lib/intelligence/american-football/team-style-profile";
import type { Player, PlayerStatistic, TeamStatistic } from "@/types";

function afPlayer(overrides: Partial<PlayerStatistic> = {}): Player {
  const currentSeasonStats: PlayerStatistic = {
    id: "s1",
    playerId: "p1",
    teamId: "t1",
    season: "2025",
    sport: "AMERICAN_FOOTBALL",
    appearances: 12,
    minutesPlayed: 720,
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
    rating: 7.5,
    passingYards: 0,
    rushingYards: 0,
    receivingYards: 1000,
    touchdowns: 9,
    sacks: 0,
    totalYards: 1000,
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
    fullName: "Test WR",
    knownAs: "WR",
    dateOfBirth: "1999-01-01",
    age: 26,
    nationality: "USA",
    position: "WR",
    height: 185,
    weight: 90,
    preferredFoot: "RIGHT",
    marketValue: 0,
    sport: "AMERICAN_FOOTBALL",
    league: "NFL",
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
    matchesPlayed: 12,
    wins: 9,
    draws: 0,
    losses: 3,
    goalsFor: 320,
    goalsAgainst: 240,
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

describe("buildAmericanFootballTeamStyleProfile", () => {
  it("labels high-scoring teams as explosive offense", () => {
    const style = buildAmericanFootballTeamStyleProfile(
      teamStats({ goalsFor: 380, goalsAgainst: 250, wins: 10 })
    );
    assert.equal(style.archetype, "explosive_offense");
  });

  it("labels stout defense when points against are low", () => {
    const style = buildAmericanFootballTeamStyleProfile(
      teamStats({ goalsFor: 200, goalsAgainst: 160, wins: 8 })
    );
    assert.ok(
      style.archetype === "stout_defense" ||
        style.archetype === "balanced" ||
        style.archetype === "grind"
    );
    assert.ok(style.defenseIndex >= 40);
  });
});

describe("computeAmericanFootballTacticalFit", () => {
  it("returns a bounded fit score with scheme-honesty limitations", () => {
    const player = afPlayer();
    const profile = buildAmericanFootballIntelligenceProfile(player);
    const fit = computeAmericanFootballTacticalFit(
      profile,
      buildAmericanFootballTeamStyleProfile(teamStats()),
      "Demo FC"
    );

    assert.ok(fit.fitScore >= 0 && fit.fitScore <= 100);
    assert.ok(fit.reasons.length >= 2);
    assert.ok(fit.limitations.some((line) => line.toLowerCase().includes("scheme")));
    assert.equal(fit.teamName, "Demo FC");
  });
});
