import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildSoccerIntelligenceProfile } from "@/lib/intelligence/soccer/build-soccer-intelligence-profile";
import { computeTacticalFit } from "@/lib/intelligence/soccer/compute-tactical-fit";
import { buildTeamStyleProfile } from "@/lib/intelligence/soccer/team-style-profile";
import type { Player, PlayerStatistic, TeamStatistic } from "@/types";

function player(position: string, goals: number): Player {
  const currentSeasonStats: PlayerStatistic = {
    id: "s1",
    playerId: "p1",
    teamId: "t1",
    season: "2025/26",
    sport: "SOCCER",
    appearances: 20,
    minutesPlayed: 900,
    goals,
    assists: 2,
    xG: goals * 0.8,
    xA: 1,
    shots: goals * 4,
    shotsOnTarget: goals * 2,
    passes: 400,
    passAccuracy: 82,
    keyPasses: 20,
    dribblesCompleted: 15,
    tacklesWon: 20,
    interceptions: 12,
    duelsWonPct: 52,
    yellowCards: 1,
    redCards: 0,
    rating: 7.1,
    per90: {
      goals: (goals / 900) * 90,
      assists: 0.2,
      shots: 2,
      keyPasses: 2,
      dribbles: 1.5,
      tackles: 2,
      interceptions: 1.2,
    },
  };

  return {
    id: "p1",
    fullName: "Test Player",
    knownAs: "Test",
    dateOfBirth: "2000-01-01",
    age: 24,
    nationality: "BR",
    position,
    height: 180,
    weight: 75,
    preferredFoot: "RIGHT",
    marketValue: 1_000_000,
    sport: "SOCCER",
    teamId: "t1",
    strengths: [],
    weaknesses: [],
    currentSeasonStats,
    availableSeasons: ["2025/26"],
    selectedSeason: "2025/26",
    history: [currentSeasonStats],
  };
}

function teamStats(overrides: Partial<TeamStatistic> = {}): TeamStatistic {
  return {
    id: "ts1",
    teamId: "t1",
    season: "2025/26",
    matchesPlayed: 20,
    wins: 10,
    draws: 5,
    losses: 5,
    goalsFor: 35,
    goalsAgainst: 22,
    xG: 32,
    xGA: 24,
    possessionPct: 58,
    passAccuracyPct: 84,
    pressuresPer90: 9,
    attackRating: 72,
    defenseRating: 65,
    ...overrides,
  };
}

describe("buildTeamStyleProfile", () => {
  it("labels possession-oriented teams", () => {
    const style = buildTeamStyleProfile(teamStats({ possessionPct: 58, pressuresPer90: 8 }));
    assert.equal(style.archetype, "possession");
  });
});

describe("computeTacticalFit", () => {
  it("returns a bounded fit score with reasons", () => {
    const profile = buildSoccerIntelligenceProfile(player("CM", 4));
    const style = buildTeamStyleProfile(teamStats());
    const fit = computeTacticalFit(profile, style, "Test FC");

    assert.ok(fit.fitScore >= 0 && fit.fitScore <= 100);
    assert.ok(fit.reasons.length >= 2);
    assert.ok(fit.limitations.length > 0);
  });
});
