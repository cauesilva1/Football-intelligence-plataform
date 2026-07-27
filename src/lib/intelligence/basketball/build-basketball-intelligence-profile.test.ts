import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildBasketballIntelligenceProfile } from "@/lib/intelligence/basketball/build-basketball-intelligence-profile";
import { classifyBasketballRole } from "@/lib/intelligence/basketball/classify-basketball-role";
import { explainBasketballSimilarity } from "@/lib/intelligence/basketball/explain-similarity";
import { buildBasketballLeaguePositionPercentileTable } from "@/lib/intelligence/basketball/league-percentiles";
import { getIntelligenceEngine, supportsIntelligence } from "@/lib/intelligence/registry";
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
    rating: 7.5,
    points: 18,
    rebounds: 4,
    steals: 1.1,
    blocks: 0.3,
    fieldGoalsPercent: 46,
    threePointsPercent: 37,
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
    height: 198,
    weight: 95,
    preferredFoot: "RIGHT",
    marketValue: 0,
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

describe("buildBasketballIntelligenceProfile", () => {
  it("classifies a high-assist guard as Primary Creator", () => {
    const player = bbPlayer("PG", { assists: 8, points: 16 });
    const role = classifyBasketballRole(player);
    assert.equal(role.label, "Primary Creator");
    assert.ok(role.confidence >= 0.7);
    assert.ok(role.evidence.length >= 1);
  });

  it("marks small samples with limitations and lower confidence", () => {
    const thin = bbPlayer("SG", {
      appearances: 3,
      minutesPlayed: 40,
      points: 22,
      assists: 2,
    });
    const profile = buildBasketballIntelligenceProfile(thin);
    assert.ok(profile.limitations.some((line) => line.includes("Small sample")));
    assert.ok(profile.dimensions.every((dimension) => dimension.confidence <= 0.45));
  });

  it("returns insufficient_data trajectory without multi-season history", () => {
    const player = bbPlayer("SF");
    const profile = buildBasketballIntelligenceProfile(player);
    assert.equal(profile.trajectory.direction, "insufficient_data");
  });

  it("detects improving trajectory across seasons", () => {
    const previous = baseStats({
      season: "2024",
      appearances: 40,
      minutesPlayed: 1100,
      rating: 6.8,
      points: 12,
    });
    const latest = baseStats({
      season: "2025",
      appearances: 40,
      minutesPlayed: 1200,
      rating: 7.6,
      points: 18,
    });
    const player = bbPlayer("SG", latest, {
      history: [previous, latest],
      availableSeasons: ["2024", "2025"],
    });
    const profile = buildBasketballIntelligenceProfile(player);
    assert.equal(profile.trajectory.direction, "improving");
  });

  it("builds league percentiles without mixing competitions", () => {
    const nbaPlayers = Array.from({ length: 10 }, (_, index) =>
      bbPlayer(
        "PG",
        { points: 10 + index, assists: 4 + index * 0.2 },
        { id: `nba-${index}`, league: "NBA" }
      )
    );
    const ncaaIntruder = bbPlayer(
      "PG",
      { points: 28, assists: 9 },
      { id: "ncaa-1", league: "NCAA" }
    );

    const table = buildBasketballLeaguePositionPercentileTable(
      [...nbaPlayers, ncaaIntruder],
      { sport: "BASKETBALL", league: "NBA", position: "PG", season: "2025" }
    );

    assert.ok(table);
    assert.equal(table!.cohortSize, 10);
    assert.equal(table!.league, "NBA");

    const relative = buildBasketballIntelligenceProfile(nbaPlayers[9], {
      percentileTable: table,
    });
    assert.equal(relative.leagueContext?.scoringMethod, "league_percentile");
    assert.ok((relative.percentiles?.length ?? 0) >= 5);
  });

  it("explains similarity with competition context when leagues differ", () => {
    const nba = bbPlayer("PG", { points: 20, assists: 7 }, { id: "a", league: "NBA" });
    const ncaa = bbPlayer("PG", { points: 19, assists: 6.5 }, { id: "b", league: "NCAA" });
    const why = explainBasketballSimilarity(nba, ncaa);
    assert.ok(why.some((line) => line.includes("Different competition context")));
  });

  it("exposes basketball through the shared registry", () => {
    assert.equal(supportsIntelligence("BASKETBALL"), true);
    const engine = getIntelligenceEngine("BASKETBALL");
    assert.ok(engine);
    const profile = engine!.buildProfile(bbPlayer("C", { points: 14, rebounds: 10, blocks: 1.8 }));
    assert.equal(profile.sport, "BASKETBALL");
    assert.equal(profile.role.label, "Defensive Anchor");
    assert.equal(profile.dimensions.length, 5);
  });
});
