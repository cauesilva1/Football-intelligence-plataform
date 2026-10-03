import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { toComparisonProfile } from "@/features/comparison/lib/categories";
import { toRadarProfile } from "@/lib/normalize";
import type { PlayerStatistic } from "@/types";

function stat(
  overrides: Partial<Omit<PlayerStatistic, "per90">> & { per90?: Partial<PlayerStatistic["per90"]> } = {}
): PlayerStatistic {
  const per90 = {
    goals: 0.2,
    assists: 0.1,
    shots: 1,
    keyPasses: 2,
    dribbles: 1,
    tackles: 1,
    interceptions: 1,
    ...overrides.per90,
  };
  return {
    id: "s",
    playerId: "p",
    teamId: "t",
    season: "2025/26",
    sport: "SOCCER",
    appearances: 20,
    minutesPlayed: 1800,
    goals: 4,
    assists: 2,
    xG: 3,
    xA: 1,
    shots: 20,
    shotsOnTarget: 8,
    passes: 400,
    passAccuracy: 80,
    keyPasses: 40,
    dribblesCompleted: 20,
    tacklesWon: 20,
    interceptions: 15,
    duelsWonPct: 50,
    yellowCards: 1,
    redCards: 0,
    rating: 7,
    ...overrides,
    per90,
  };
}

describe("comparison scale", () => {
  it("keeps creativity on the 0–100 index when cross volume is high", () => {
    const profile = toComparisonProfile(
      stat({ per90: { keyPasses: 8, assists: 0.45 } })
    );
    assert.ok(profile.Creativity <= 100);
    assert.ok(profile.Creativity >= 0);
    for (const value of Object.values(profile)) {
      assert.ok(value <= 100 && value >= 0);
    }
  });

  it("treats a leaked season-total of crosses as a per-90 rate", () => {
    const profile = toComparisonProfile(
      stat({
        minutesPlayed: 1800,
        keyPasses: 80,
        per90: { keyPasses: 80, assists: 0 },
      })
    );
    assert.ok(profile.Creativity < 50);
    const radar = toRadarProfile(
      stat({
        minutesPlayed: 1800,
        keyPasses: 80,
        per90: { keyPasses: 80, assists: 0 },
      })
    );
    assert.ok(radar.Creation <= 100);
  });
});
