import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveSelectedSeasonStats } from "@/lib/metrics/map-season-stats";
import type { PlayerStatistic } from "@/types";

function season(partial: Partial<PlayerStatistic> & { season: string }): PlayerStatistic {
  return {
    id: partial.season,
    playerId: "p",
    teamId: "t",
    appearances: 0,
    minutesPlayed: 0,
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
    ...partial,
  };
}

describe("resolveSelectedSeasonStats", () => {
  it("keeps the chip on the season that has production when a newer stub only has a placeholder rating", () => {
    const history = [
      season({ season: "202526", points: 32, appearances: 70, rating: 9.1 }),
      season({ season: "202627", points: 0, appearances: 0, rating: 6.8 }),
    ];
    const resolved = resolveSelectedSeasonStats(history, undefined, "BASKETBALL");
    assert.equal(resolved.selectedSeason, "202526");
    assert.equal(resolved.currentSeasonStats.season, "202526");
    assert.equal(resolved.availableSeasons.includes("202627"), false);
  });

  it("honors an explicit season even when that row is still empty", () => {
    const history = [
      season({ season: "202526", points: 32, appearances: 70, rating: 9.1 }),
      season({ season: "202627", points: 0, appearances: 0, rating: 6.8 }),
    ];
    const resolved = resolveSelectedSeasonStats(history, "202627", "BASKETBALL", true);
    assert.equal(resolved.selectedSeason, "202627");
    assert.equal(resolved.currentSeasonStats.season, "202627");
  });
});
