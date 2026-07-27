import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildSoccerIntelligenceProfile } from "@/lib/intelligence/soccer/build-soccer-intelligence-profile";
import { buildLeaguePositionPercentileTable } from "@/lib/intelligence/soccer/league-percentiles";
import { classifySoccerRole } from "@/lib/intelligence/soccer/classify-soccer-role";
import { explainSoccerSimilarity } from "@/lib/intelligence/soccer/explain-similarity";
import type { Player, PlayerStatistic } from "@/types";

function baseStats(overrides: Partial<PlayerStatistic> = {}): PlayerStatistic {
  return {
    id: "stat-1",
    playerId: "p1",
    teamId: "t1",
    season: "2025/26",
    sport: "SOCCER",
    appearances: 20,
    minutesPlayed: 900,
    goals: 0,
    assists: 0,
    xG: 0,
    xA: 0,
    shots: 0,
    shotsOnTarget: 0,
    passes: 400,
    passAccuracy: 75,
    keyPasses: 0,
    dribblesCompleted: 0,
    tacklesWon: 0,
    interceptions: 0,
    duelsWonPct: 50,
    yellowCards: 0,
    redCards: 0,
    rating: 6.8,
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

function soccerPlayer(
  position: string,
  statsOverrides: Partial<PlayerStatistic> = {},
  playerOverrides: Partial<Player> = {}
): Player {
  const stats = baseStats(statsOverrides);
  return {
    id: `player-${position.toLowerCase()}`,
    fullName: `Test ${position}`,
    knownAs: position,
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
    currentSeasonStats: stats,
    availableSeasons: ["2025/26"],
    selectedSeason: "2025/26",
    history: [stats],
    ...playerOverrides,
  };
}

describe("classifySoccerRole", () => {
  it("labels a high-finishing striker as Clinical Finisher", () => {
    const striker = soccerPlayer("ST", {
      goals: 18,
      xG: 14,
      shots: 70,
      per90: {
        goals: 1.8,
        assists: 0.2,
        shots: 7,
        keyPasses: 1,
        dribbles: 2,
        tackles: 0.5,
        interceptions: 0.2,
      },
    });
    assert.equal(classifySoccerRole(striker), "Clinical Finisher");
  });

  it("labels a defensive centre-back as Ball-winning Centre-back", () => {
    const cb = soccerPlayer("CB", {
      goals: 1,
      tacklesWon: 55,
      interceptions: 40,
      duelsWonPct: 68,
      passAccuracy: 82,
      per90: {
        goals: 0.05,
        assists: 0.05,
        shots: 0.2,
        keyPasses: 0.4,
        dribbles: 0.3,
        tackles: 3.2,
        interceptions: 2.4,
      },
    });
    assert.equal(classifySoccerRole(cb), "Ball-winning Centre-back");
  });

  it("labels a creative midfielder as Progressive Playmaker", () => {
    const cm = soccerPlayer("CM", {
      goals: 4,
      assists: 10,
      keyPasses: 55,
      passAccuracy: 88,
      per90: {
        goals: 0.4,
        assists: 1.0,
        shots: 1.5,
        keyPasses: 2.8,
        dribbles: 1.2,
        tackles: 1.8,
        interceptions: 1.1,
      },
    });
    assert.equal(classifySoccerRole(cm), "Progressive Playmaker");
  });
});

describe("buildSoccerIntelligenceProfile", () => {
  const striker = soccerPlayer("ST", {
    goals: 18,
    xG: 14,
    shots: 70,
    per90: {
      goals: 1.8,
      assists: 0.2,
      shots: 7,
      keyPasses: 1,
      dribbles: 2,
      tackles: 0.5,
      interceptions: 0.2,
    },
  });

  const centreBack = soccerPlayer("CB", {
    goals: 1,
    tacklesWon: 55,
    interceptions: 40,
    duelsWonPct: 68,
    per90: {
      goals: 0.05,
      assists: 0.05,
      shots: 0.2,
      keyPasses: 0.4,
      dribbles: 0.3,
      tackles: 3.2,
      interceptions: 2.4,
    },
  });

  it("returns different roles and dimension emphasis for ST vs CB", () => {
    const stProfile = buildSoccerIntelligenceProfile(striker);
    const cbProfile = buildSoccerIntelligenceProfile(centreBack);

    assert.notEqual(stProfile.role, cbProfile.role);
    assert.equal(stProfile.role, "Clinical Finisher");
    assert.equal(cbProfile.role, "Ball-winning Centre-back");

    const stProduction = stProfile.dimensions.find((d) => d.key === "production")!;
    const cbProduction = cbProfile.dimensions.find((d) => d.key === "production")!;
    assert.ok(stProduction.score > cbProduction.score);
  });

  it("flags low confidence and limitations for small samples", () => {
    const thin = soccerPlayer("CM", { minutesPlayed: 180, appearances: 4 });
    const profile = buildSoccerIntelligenceProfile(thin);

    assert.ok(profile.dimensions.every((d) => d.confidence <= 0.4));
    assert.ok(profile.limitations.some((line) => line.includes("Small sample")));
  });

  it("attaches three similarity reasons to comparables", () => {
    const pool = [
      striker,
      soccerPlayer(
        "ST",
        {
          goals: 16,
          xG: 13,
          shots: 65,
          per90: {
            goals: 1.6,
            assists: 0.3,
            shots: 6.5,
            keyPasses: 1.2,
            dribbles: 2.1,
            tackles: 0.4,
            interceptions: 0.3,
          },
        },
        { id: "player-st-alt" }
      ),
    ];

    const profile = buildSoccerIntelligenceProfile(striker, { comparablesPool: pool, comparablesLimit: 1 });
    assert.equal(profile.comparables.length, 1);
    assert.equal(profile.comparables[0].why.length, 3);
  });

  it("uses league percentiles when a cohort table is supplied", () => {
    const cohort = [
      striker,
      ...Array.from({ length: 8 }, (_, index) =>
        soccerPlayer("ST", {
          goals: index + 2,
          xG: index + 1.5,
          shots: 30 + index * 5,
          per90: {
            goals: (index + 2) / 10,
            assists: 0.1 + index * 0.05,
            shots: 3 + index * 0.5,
            keyPasses: 0.5 + index * 0.1,
            dribbles: 1 + index * 0.1,
            tackles: 0.2,
            interceptions: 0.1,
          },
        })
      ),
    ];

    const table = buildLeaguePositionPercentileTable(cohort, {
      sport: "SOCCER",
      league: "liga-test",
      position: "ST",
      season: "2025/26",
    });
    assert.ok(table);

    const relativeProfile = buildSoccerIntelligenceProfile(striker, { percentileTable: table });
    assert.equal(relativeProfile.leagueContext?.scoringMethod, "league_percentile");
    assert.ok(relativeProfile.dimensions.every((dimension) => dimension.evidence.some((e) => e.label === "League percentile")));
  });
});

describe("explainSoccerSimilarity", () => {
  it("returns three human-readable alignment lines", () => {
    const a = soccerPlayer("ST", {
      goals: 15,
      xG: 12,
      shots: 60,
      per90: {
        goals: 1.5,
        assists: 0.2,
        shots: 6,
        keyPasses: 1,
        dribbles: 2,
        tackles: 0.5,
        interceptions: 0.2,
      },
    });
    const b = soccerPlayer(
      "ST",
      {
        goals: 14,
        xG: 11,
        shots: 58,
        per90: {
          goals: 1.4,
          assists: 0.25,
          shots: 5.8,
          keyPasses: 1.1,
          dribbles: 1.9,
          tackles: 0.45,
          interceptions: 0.25,
        },
      },
      { id: "player-st-2" }
    );

    const why = explainSoccerSimilarity(a, b);
    assert.equal(why.length, 3);
    assert.ok(why.every((line) => line.includes("aligned")));
  });
});
