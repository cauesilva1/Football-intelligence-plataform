import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildBasketballIntelligenceProfile } from "@/lib/intelligence/basketball/build-basketball-intelligence-profile";
import {
  normalizeBasketballRecruitmentPriorities,
  rankBasketballRecruitmentCandidates,
  scoreBasketballRecruitmentFit,
} from "@/lib/intelligence/basketball/score-recruitment-fit";
import { RECRUITMENT_DISCLAIMER } from "@/lib/intelligence/recruitment-types";
import type { Player, PlayerStatistic } from "@/types";

function baseStats(overrides: Partial<PlayerStatistic> = {}): PlayerStatistic {
  return {
    id: "stat-1",
    playerId: "p1",
    teamId: "t1",
    season: "2025",
    sport: "BASKETBALL",
    appearances: 40,
    minutesPlayed: 1200,
    goals: 0,
    assists: 5,
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
    rating: 7.4,
    points: 16,
    rebounds: 4,
    steals: 1,
    blocks: 0.3,
    fieldGoalsPercent: 45,
    threePointsPercent: 36,
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
}

function bbPlayer(
  id: string,
  position: string,
  statsOverrides: Partial<PlayerStatistic> = {},
  playerOverrides: Partial<Player> = {}
): Player {
  const stats = baseStats({ ...statsOverrides, playerId: id });
  return {
    id,
    fullName: id,
    knownAs: id,
    dateOfBirth: "1999-01-01",
    age: 26,
    nationality: "USA",
    position,
    height: 198,
    weight: 95,
    preferredFoot: "RIGHT",
    marketValue: 2_000_000,
    capHit: 8_000_000,
    teamId: "t1",
    sport: "BASKETBALL",
    league: "NBA",
    strengths: [],
    weaknesses: [],
    currentSeasonStats: stats,
    availableSeasons: [stats.season],
    selectedSeason: stats.season,
    history: [stats],
    ...playerOverrides,
  };
}

describe("normalizeBasketballRecruitmentPriorities", () => {
  it("defaults playmaking-heavy weights for guards", () => {
    const weights = normalizeBasketballRecruitmentPriorities({
      sport: "BASKETBALL",
      position: "PG",
    });
    assert.ok(weights.playmaking > weights.rebounding);
  });
});

describe("scoreBasketballRecruitmentFit", () => {
  const brief = {
    sport: "BASKETBALL" as const,
    position: "PG",
    maxAge: 28,
    preferredRoles: ["Primary Creator"],
    trajectory: "any" as const,
  };

  it("ranks a primary creator above a low-assist guard for a PG brief", () => {
    const creator = bbPlayer("creator", "PG", { points: 18, assists: 9 });
    const scorer = bbPlayer("scorer", "PG", { points: 22, assists: 2 });

    const creatorFit = scoreBasketballRecruitmentFit(
      brief,
      creator,
      buildBasketballIntelligenceProfile(creator)
    );
    const scorerFit = scoreBasketballRecruitmentFit(
      brief,
      scorer,
      buildBasketballIntelligenceProfile(scorer)
    );

    assert.ok(creatorFit);
    assert.ok(scorerFit);
    assert.ok(creatorFit.fitScore >= scorerFit.fitScore);
    assert.ok(creatorFit.limitations.includes(RECRUITMENT_DISCLAIMER));
    assert.ok(["HIGH", "MEDIUM", "LOW"].includes(creatorFit.dataConfidence));
  });

  it("rejects wrong position groups", () => {
    const big = bbPlayer("big", "C", { points: 14, rebounds: 11, blocks: 2 });
    const fit = scoreBasketballRecruitmentFit(
      brief,
      big,
      buildBasketballIntelligenceProfile(big)
    );
    assert.equal(fit, null);
  });

  it("orders candidates by fit score", () => {
    const elite = bbPlayer("elite", "PG", { points: 20, assists: 9, rating: 8.2 });
    const average = bbPlayer("avg", "PG", { points: 11, assists: 4, rating: 6.9 });
    const profiles = new Map([
      [elite.id, buildBasketballIntelligenceProfile(elite)],
      [average.id, buildBasketballIntelligenceProfile(average)],
    ]);

    const ranked = rankBasketballRecruitmentCandidates(
      brief,
      [average, elite],
      profiles
    );
    assert.equal(ranked.length, 2);
    assert.ok(ranked[0].fitScore >= ranked[1].fitScore);
    assert.equal(ranked[0].playerId, "elite");
  });

  it("respects maxCapHit constraints", () => {
    const expensive = bbPlayer(
      "cap",
      "PG",
      { points: 20, assists: 8 },
      { capHit: 40_000_000 }
    );
    const fit = scoreBasketballRecruitmentFit(
      { ...brief, maxCapHit: 10_000_000 },
      expensive,
      buildBasketballIntelligenceProfile(expensive)
    );
    assert.equal(fit, null);
  });
});
