import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildAmericanFootballIntelligenceProfile } from "@/lib/intelligence/american-football/build-american-football-intelligence-profile";
import {
  normalizeAmericanFootballRecruitmentPriorities,
  rankAmericanFootballRecruitmentCandidates,
  scoreAmericanFootballRecruitmentFit,
} from "@/lib/intelligence/american-football/score-recruitment-fit";
import { RECRUITMENT_DISCLAIMER } from "@/lib/intelligence/recruitment-types";
import type { Player, PlayerStatistic } from "@/types";

function baseStats(overrides: Partial<PlayerStatistic> = {}): PlayerStatistic {
  return {
    id: "stat-1",
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
    rating: 7.4,
    passingYards: 0,
    rushingYards: 0,
    receivingYards: 800,
    touchdowns: 6,
    sacks: 0,
    totalYards: 800,
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

function afPlayer(
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
    height: 185,
    weight: 95,
    preferredFoot: "RIGHT",
    marketValue: 1_000_000,
    teamId: "t1",
    sport: "AMERICAN_FOOTBALL",
    league: "NFL",
    strengths: [],
    weaknesses: [],
    currentSeasonStats: stats,
    availableSeasons: [stats.season],
    selectedSeason: stats.season,
    history: [stats],
    ...playerOverrides,
  };
}

describe("normalizeAmericanFootballRecruitmentPriorities", () => {
  it("defaults passing-heavy weights for QBs", () => {
    const weights = normalizeAmericanFootballRecruitmentPriorities({
      sport: "AMERICAN_FOOTBALL",
      position: "QB",
    });
    assert.ok(weights.passing > weights.receiving);
  });
});

describe("scoreAmericanFootballRecruitmentFit", () => {
  const brief = {
    sport: "AMERICAN_FOOTBALL" as const,
    position: "WR",
    maxAge: 28,
    preferredRoles: ["Vertical Threat WR"],
    trajectory: "any" as const,
  };

  it("ranks a vertical threat above a low-volume WR", () => {
    const star = afPlayer("star", "WR", { receivingYards: 1300, touchdowns: 11, rating: 8.1 });
    const depth = afPlayer("depth", "WR", { receivingYards: 350, touchdowns: 2, rating: 6.6 });

    const starFit = scoreAmericanFootballRecruitmentFit(
      brief,
      star,
      buildAmericanFootballIntelligenceProfile(star)
    );
    const depthFit = scoreAmericanFootballRecruitmentFit(
      brief,
      depth,
      buildAmericanFootballIntelligenceProfile(depth)
    );

    assert.ok(starFit);
    assert.ok(depthFit);
    assert.ok(starFit.fitScore >= depthFit.fitScore);
    assert.ok(starFit.limitations.includes(RECRUITMENT_DISCLAIMER));
  });

  it("rejects wrong position groups", () => {
    const qb = afPlayer("qb", "QB", { passingYards: 4000, touchdowns: 30 });
    const fit = scoreAmericanFootballRecruitmentFit(
      brief,
      qb,
      buildAmericanFootballIntelligenceProfile(qb)
    );
    assert.equal(fit, null);
  });

  it("orders candidates by fit score", () => {
    const elite = afPlayer("elite", "WR", { receivingYards: 1400, touchdowns: 12, rating: 8.4 });
    const average = afPlayer("avg", "WR", { receivingYards: 500, touchdowns: 3, rating: 6.8 });
    const profiles = new Map([
      [elite.id, buildAmericanFootballIntelligenceProfile(elite)],
      [average.id, buildAmericanFootballIntelligenceProfile(average)],
    ]);

    const ranked = rankAmericanFootballRecruitmentCandidates(
      brief,
      [average, elite],
      profiles
    );
    assert.equal(ranked.length, 2);
    assert.ok(ranked[0].fitScore >= ranked[1].fitScore);
    assert.equal(ranked[0].playerId, "elite");
  });
});
