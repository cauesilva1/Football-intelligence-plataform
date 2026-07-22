import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  basketballRatingSmallSample,
  computeBasketballMatchRating,
  computeBasketballRating,
  computeBasketballReportOverallRating,
  hasReliableBasketballSample,
  reliableBasketballRating,
} from "@/lib/scoring/basketball-rating";

describe("hasReliableBasketballSample", () => {
  it("requires both games and minutes floors", () => {
    assert.equal(
      hasReliableBasketballSample({ matchesPlayed: 9, minutesPlayed: 400 }),
      false
    );
    assert.equal(
      hasReliableBasketballSample({ matchesPlayed: 10, minutesPlayed: 199 }),
      false
    );
    assert.equal(
      hasReliableBasketballSample({ matchesPlayed: 10, minutesPlayed: 200 }),
      true
    );
  });
});

describe("computeBasketballRating", () => {
  it("caps small samples at 7.0", () => {
    const rating = computeBasketballRating({
      matchesPlayed: 2,
      minutesPlayed: 40,
      points: 30,
      rebounds: 10,
      assists: 8,
      steals: 3,
      blocks: 2,
    });
    assert.ok(rating <= 7);
    assert.equal(rating, basketballRatingSmallSample({
      matchesPlayed: 2,
      minutesPlayed: 40,
      points: 30,
      rebounds: 10,
      assists: 8,
      steals: 3,
      blocks: 2,
    }));
  });

  it("rewards all-around production on a reliable sample", () => {
    const rating = computeBasketballRating({
      matchesPlayed: 40,
      minutesPlayed: 1200,
      points: 22,
      rebounds: 6,
      assists: 7,
      steals: 1.4,
      blocks: 0.4,
    });
    assert.ok(rating >= 8);
    assert.ok(rating <= 10);
  });
});

describe("reliableBasketballRating", () => {
  it("dampens inflated stored ratings on thin samples", () => {
    const rating = reliableBasketballRating({
      matchesPlayed: 3,
      minutesPlayed: 50,
      points: 18,
      rebounds: 4,
      assists: 4,
      steals: 1,
      blocks: 0,
      rating: 9.5,
    });
    assert.ok(rating <= 7);
  });

  it("matches report rounding", () => {
    const stat = {
      matchesPlayed: 40,
      minutesPlayed: 1200,
      points: 18,
      rebounds: 5,
      assists: 5,
      steals: 1,
      blocks: 0.5,
      rating: 8.2,
    };
    assert.equal(
      computeBasketballReportOverallRating(stat),
      Number(reliableBasketballRating(stat).toFixed(1))
    );
  });
});

describe("computeBasketballMatchRating", () => {
  it("returns null with zero minutes", () => {
    assert.equal(
      computeBasketballMatchRating({
        minutesPlayed: 0,
        points: 20,
        rebounds: 5,
        assists: 5,
        steals: 1,
        blocks: 1,
      }),
      null
    );
  });

  it("starts near baseline for quiet games", () => {
    const rating = computeBasketballMatchRating({
      minutesPlayed: 28,
      points: 8,
      rebounds: 3,
      assists: 2,
      steals: 0,
      blocks: 0,
      fieldGoalsMade: 3,
      fieldGoalsAttempted: 9,
    });
    assert.ok(rating != null && rating >= 6 && rating <= 8);
  });
});
