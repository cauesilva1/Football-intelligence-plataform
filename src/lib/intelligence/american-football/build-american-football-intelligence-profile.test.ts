import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildAmericanFootballIntelligenceProfile } from "@/lib/intelligence/american-football/build-american-football-intelligence-profile";
import { classifyAmericanFootballRole } from "@/lib/intelligence/american-football/classify-american-football-role";
import { explainAmericanFootballSimilarity } from "@/lib/intelligence/american-football/explain-similarity";
import { buildAmericanFootballLeaguePositionPercentileTable } from "@/lib/intelligence/american-football/league-percentiles";
import { getIntelligenceEngine, supportsIntelligence } from "@/lib/intelligence/registry";
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
    receivingYards: 900,
    touchdowns: 8,
    sacks: 0,
    totalYards: 900,
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
  position: string,
  statsOverrides: Partial<PlayerStatistic> = {},
  playerOverrides: Partial<Player> = {}
): Player {
  const stats = baseStats({ ...statsOverrides, playerId: playerOverrides.id ?? "p1" });
  return {
    id: "p1",
    fullName: "Test Player",
    knownAs: "Test",
    dateOfBirth: "1998-01-01",
    age: 27,
    nationality: "USA",
    position,
    height: 185,
    weight: 95,
    preferredFoot: "RIGHT",
    marketValue: 0,
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

describe("buildAmericanFootballIntelligenceProfile", () => {
  it("classifies a high-volume WR as Vertical Threat WR", () => {
    const player = afPlayer("WR", { receivingYards: 1200, touchdowns: 10 });
    const role = classifyAmericanFootballRole(player);
    assert.equal(role.label, "Vertical Threat WR");
    assert.ok(role.confidence >= 0.7);
  });

  it("marks small samples and OL limitations honestly", () => {
    const thin = afPlayer("WR", { appearances: 2, minutesPlayed: 80, receivingYards: 200 });
    const thinProfile = buildAmericanFootballIntelligenceProfile(thin);
    assert.ok(thinProfile.limitations.some((line) => line.includes("Small sample")));

    const ol = afPlayer("OL", { appearances: 12, minutesPlayed: 720 });
    const olProfile = buildAmericanFootballIntelligenceProfile(ol);
    assert.equal(olProfile.role.label, "Offensive Lineman");
    assert.ok(olProfile.limitations.some((line) => line.toLowerCase().includes("blocking")));
    assert.ok(olProfile.dimensions.every((dimension) => dimension.confidence <= 0.3));
  });

  it("returns insufficient_data trajectory without multi-season history", () => {
    const profile = buildAmericanFootballIntelligenceProfile(afPlayer("QB", { passingYards: 3200 }));
    assert.equal(profile.trajectory.direction, "insufficient_data");
  });

  it("builds league percentiles without mixing NFL and CFB", () => {
    const nflPlayers = Array.from({ length: 10 }, (_, index) =>
      afPlayer(
        "WR",
        { receivingYards: 400 + index * 50, touchdowns: 3 + index },
        { id: `nfl-${index}`, league: "NFL" }
      )
    );
    const cfbIntruder = afPlayer(
      "WR",
      { receivingYards: 1400, touchdowns: 14 },
      { id: "cfb-1", league: "College Football" }
    );

    const table = buildAmericanFootballLeaguePositionPercentileTable(
      [...nflPlayers, cfbIntruder],
      { sport: "AMERICAN_FOOTBALL", league: "NFL", position: "WR", season: "2025" }
    );

    assert.ok(table);
    assert.equal(table!.cohortSize, 10);
    assert.equal(table!.league, "NFL");
  });

  it("explains similarity with competition context when leagues differ", () => {
    const nfl = afPlayer("WR", { receivingYards: 1000 }, { id: "a", league: "NFL" });
    const cfb = afPlayer(
      "WR",
      { receivingYards: 980 },
      { id: "b", league: "College Football" }
    );
    const why = explainAmericanFootballSimilarity(nfl, cfb);
    assert.ok(why.some((line) => line.includes("Different competition context")));
  });

  it("exposes American football through the shared registry", () => {
    assert.equal(supportsIntelligence("AMERICAN_FOOTBALL"), true);
    const engine = getIntelligenceEngine("AMERICAN_FOOTBALL");
    assert.ok(engine);
    const profile = engine!.buildProfile(
      afPlayer("QB", { passingYards: 3800, rushingYards: 400, touchdowns: 28 })
    );
    assert.equal(profile.sport, "AMERICAN_FOOTBALL");
    assert.equal(profile.role.label, "Dual-Threat QB");
    assert.equal(profile.dimensions.length, 5);
  });
});
