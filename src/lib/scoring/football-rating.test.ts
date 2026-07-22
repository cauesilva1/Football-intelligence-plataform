import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  computeFootballMatchRating,
  computeFootballRating,
  footballPositionGroup,
  hasReliableFootballSample,
} from "@/lib/scoring/football-rating";

describe("footballPositionGroup", () => {
  it("maps QB / skill / defense", () => {
    assert.equal(footballPositionGroup("QB"), "QB");
    assert.equal(footballPositionGroup("WR"), "SKILL");
    assert.equal(footballPositionGroup("LB"), "DEFENSE");
  });
});

describe("hasReliableFootballSample", () => {
  it("requires games and proxy minutes", () => {
    assert.equal(hasReliableFootballSample({ matchesPlayed: 6, minutesPlayed: 360 }), true);
    assert.equal(hasReliableFootballSample({ matchesPlayed: 2, minutesPlayed: 120 }), false);
  });
});

describe("computeFootballRating", () => {
  it("caps small samples", () => {
    const rating = computeFootballRating(
      {
        matchesPlayed: 1,
        minutesPlayed: 60,
        totalYards: 400,
        touchdowns: 4,
        tackles: 0,
        sacks: 0,
      },
      "QB"
    );
    assert.ok(rating <= 7);
  });

  it("rates productive QBs higher with reliable sample", () => {
    const rating = computeFootballRating(
      {
        matchesPlayed: 12,
        minutesPlayed: 720,
        totalYards: 3600,
        touchdowns: 28,
        tackles: 0,
        sacks: 0,
        passingYards: 3600,
      },
      "QB"
    );
    assert.ok(rating >= 7.5);
  });
});

describe("computeFootballMatchRating", () => {
  it("returns null without minutes", () => {
    assert.equal(
      computeFootballMatchRating({
        minutesPlayed: 0,
        totalYards: 100,
        touchdowns: 1,
        tackles: 0,
        sacks: 0,
      }),
      null
    );
  });

  it("starts near baseline", () => {
    const rating = computeFootballMatchRating({
      minutesPlayed: 60,
      totalYards: 0,
      touchdowns: 0,
      tackles: 0,
      sacks: 0,
    });
    assert.equal(rating, 6.5);
  });
});
