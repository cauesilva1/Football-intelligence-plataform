import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { seedRecruitmentBriefFromPlayer } from "@/lib/intelligence/seed-recruitment-brief";
import type { IntelligenceProfile } from "@/lib/intelligence/types";
import type { Player, PlayerStatistic } from "@/types";

function stats(overrides: Partial<PlayerStatistic> = {}): PlayerStatistic {
  return {
    id: "s1",
    playerId: "target-1",
    teamId: "t1",
    season: "2025",
    sport: "SOCCER",
    appearances: 20,
    minutesPlayed: 1600,
    goals: 8,
    assists: 3,
    xG: 7,
    xA: 2,
    shots: 40,
    shotsOnTarget: 18,
    passes: 400,
    passAccuracy: 80,
    keyPasses: 20,
    dribblesCompleted: 10,
    tacklesWon: 5,
    interceptions: 4,
    duelsWonPct: 50,
    yellowCards: 1,
    redCards: 0,
    rating: 7.4,
    per90: {
      goals: 0.45,
      assists: 0.17,
      shots: 2.2,
      keyPasses: 1.1,
      dribbles: 0.6,
      tackles: 0.3,
      interceptions: 0.2,
    },
    ...overrides,
  };
}

function player(overrides: Partial<Player> = {}): Player {
  const current = stats({ playerId: overrides.id ?? "target-1" });
  return {
    id: "target-1",
    fullName: "Target Player",
    knownAs: "Target",
    dateOfBirth: "1999-01-01",
    age: 26,
    nationality: "BRA",
    position: "ST",
    height: 180,
    weight: 75,
    preferredFoot: "RIGHT",
    marketValue: 8_000_000,
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

function profile(): IntelligenceProfile {
  return {
    sport: "SOCCER",
    playerId: "target-1",
    season: "2025",
    role: { label: "Clinical Finisher", confidence: 0.8, evidence: [] },
    dimensions: [
      {
        key: "production",
        label: "Production",
        score: 82,
        confidence: 0.9,
        evidence: [],
      },
      {
        key: "creation",
        label: "Creation",
        score: 55,
        confidence: 0.7,
        evidence: [],
      },
      {
        key: "defense",
        label: "Defense",
        score: 30,
        confidence: 0.5,
        evidence: [],
      },
      {
        key: "ball_progression",
        label: "Ball progression",
        score: 48,
        confidence: 0.6,
        evidence: [],
      },
    ],
    trajectory: { direction: "stable", evidence: [] },
    limitations: [],
    comparables: [],
  };
}

describe("seedRecruitmentBriefFromPlayer", () => {
  it("seeds position, age ceiling, market cap, and excludes the target", () => {
    const brief = seedRecruitmentBriefFromPlayer(player(), profile());
    assert.equal(brief.position, "ST");
    assert.equal(brief.maxAge, 26);
    assert.equal(brief.maxMarketValue, 8_000_000);
    assert.deepEqual(brief.excludePlayerIds, ["target-1"]);
    assert.equal(brief.seedFromPlayerId, "target-1");
    assert.ok(brief.preferredRoles?.includes("Clinical Finisher"));
    assert.ok(brief.priorities?.production);
    assert.ok((brief.minRating ?? 0) <= 7.4);
  });

  it("does not invent maxCapHit when salary is missing", () => {
    const brief = seedRecruitmentBriefFromPlayer(
      player({
        sport: "BASKETBALL",
        position: "PG",
        marketValue: 0,
        capHit: 0,
        league: "NBA",
      }),
      { ...profile(), sport: "BASKETBALL", role: { label: "Primary Creator", confidence: 0.7, evidence: [] } }
    );
    assert.equal(brief.maxCapHit, undefined);
    assert.equal(brief.maxMarketValue, undefined);
  });
});
