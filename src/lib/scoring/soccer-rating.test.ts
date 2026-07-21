import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  computeSoccerRating,
  computeReportOverallRating,
  computeMatchRating,
  reliableSoccerRating,
  soccerRatingFromRates,
} from "@/lib/scoring/soccer-rating";

describe("computeSoccerRating", () => {
  it("caps tiny samples", () => {
    const rating = computeSoccerRating({ minutesPlayed: 3, goals: 1, assists: 0 });
    assert.ok(rating <= 7);
  });

  it("uses rate formula for reliable samples", () => {
    const rating = soccerRatingFromRates({ minutesPlayed: 900, goals: 15, assists: 8 });
    assert.equal(rating, computeSoccerRating({ minutesPlayed: 900, goals: 15, assists: 8 }));
    assert.ok(rating >= 6.5);
  });
});

describe("computeReportOverallRating", () => {
  it("matches reliableSoccerRating rounding", () => {
    const stat = { minutesPlayed: 900, goals: 0, assists: 0, rating: 9.5 };
    assert.equal(computeReportOverallRating(stat), Number(reliableSoccerRating(stat).toFixed(1)));
  });
});

describe("computeMatchRating", () => {
  it("returns null with no minutes", () => {
    assert.equal(
      computeMatchRating({
        minutesPlayed: 0,
        goals: 1,
        assists: 0,
        tackles: 0,
        interceptions: 0,
      }),
      null
    );
  });

  it("starts near baseline and rises with goals", () => {
    const base = computeMatchRating({
      minutesPlayed: 90,
      goals: 0,
      assists: 0,
      tackles: 0,
      interceptions: 0,
    });
    const scored = computeMatchRating({
      minutesPlayed: 90,
      goals: 1,
      assists: 0,
      tackles: 0,
      interceptions: 0,
    });
    assert.ok(base != null && base >= 6.4 && base <= 6.6);
    assert.ok(scored != null && scored > base);
  });
});
