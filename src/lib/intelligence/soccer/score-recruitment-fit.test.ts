import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildSoccerIntelligenceProfile } from "@/lib/intelligence/soccer/build-soccer-intelligence-profile";
import { RECRUITMENT_DISCLAIMER } from "@/lib/intelligence/soccer/recruitment-types";
import {
  normalizeRecruitmentPriorities,
  rankRecruitmentCandidates,
  scoreRecruitmentFit,
} from "@/lib/intelligence/soccer/score-recruitment-fit";
import type { Player, PlayerStatistic } from "@/types";

function stat(goals: number, assists: number, keyPasses: number, minutes = 900): PlayerStatistic {
  return {
    id: "s1",
    playerId: "p1",
    teamId: "t1",
    season: "2025/26",
    sport: "SOCCER",
    appearances: 20,
    minutesPlayed: minutes,
    goals,
    assists,
    xG: goals * 0.8,
    xA: assists * 0.7,
    shots: goals * 4,
    shotsOnTarget: goals * 2,
    passes: 400,
    passAccuracy: 80,
    keyPasses,
    dribblesCompleted: 20,
    tacklesWon: 30,
    interceptions: 20,
    duelsWonPct: 55,
    yellowCards: 1,
    redCards: 0,
    rating: 7.2,
    per90: {
      goals: (goals / minutes) * 90,
      assists: (assists / minutes) * 90,
      shots: 2,
      keyPasses: (keyPasses / minutes) * 90,
      dribbles: 2,
      tackles: 3,
      interceptions: 2,
    },
  };
}

function player(
  id: string,
  position: string,
  goals: number,
  assists: number,
  keyPasses: number,
  overrides: Partial<Player> = {}
): Player {
  const currentSeasonStats = stat(goals, assists, keyPasses);
  return {
    id,
    fullName: id,
    knownAs: id,
    dateOfBirth: "2000-01-01",
    age: 22,
    nationality: "BR",
    position,
    height: 180,
    weight: 75,
    preferredFoot: "RIGHT",
    marketValue: 2_000_000,
    sport: "SOCCER",
    league: "liga-test",
    teamId: "t1",
    teamName: "Club",
    strengths: [],
    weaknesses: [],
    currentSeasonStats,
    availableSeasons: ["2025/26"],
    selectedSeason: "2025/26",
    history: [currentSeasonStats],
    ...overrides,
  };
}

describe("normalizeRecruitmentPriorities", () => {
  it("defaults attack-heavy weights for strikers", () => {
    const weights = normalizeRecruitmentPriorities({ sport: "SOCCER", position: "ST" });
    assert.ok(weights.production > weights.defense);
  });
});

describe("scoreRecruitmentFit", () => {
  const brief = {
    sport: "SOCCER" as const,
    position: "ST",
    maxAge: 25,
    maxMarketValue: 5_000_000,
    preferredRoles: ["Clinical Finisher"],
    trajectory: "improving" as const,
  };

  it("ranks a high-production striker above a defensive midfielder for an ST brief", () => {
    const striker = player("st", "ST", 16, 3, 20);
    const midfielder = player("cm", "CM", 4, 8, 40);

    const strikerFit = scoreRecruitmentFit(
      brief,
      striker,
      buildSoccerIntelligenceProfile(striker)
    );
    const midfielderFit = scoreRecruitmentFit(
      brief,
      midfielder,
      buildSoccerIntelligenceProfile(midfielder)
    );

    assert.ok(strikerFit);
    assert.equal(midfielderFit, null);
    assert.ok(strikerFit.fitScore >= 40);
    assert.ok(strikerFit.limitations.includes(RECRUITMENT_DISCLAIMER));
  });

  it("orders multiple strikers by fit score", () => {
    const elite = player("elite", "ST", 18, 4, 25);
    const average = player("avg", "ST", 8, 2, 12);
    const profiles = new Map([
      [elite.id, buildSoccerIntelligenceProfile(elite)],
      [average.id, buildSoccerIntelligenceProfile(average)],
    ]);

    const ranked = rankRecruitmentCandidates(brief, [average, elite], profiles);
    assert.equal(ranked.length, 2);
    assert.ok(ranked[0].fitScore >= ranked[1].fitScore);
    assert.equal(ranked[0].playerId, "elite");
  });
});
