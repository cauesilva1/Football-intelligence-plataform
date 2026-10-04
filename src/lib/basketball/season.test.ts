import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  basketballSeasonKey,
  nbaGameCountsTowardSeason,
  resolveEuroLeagueSeason,
  resolveNbaBoxscoreSeason,
  resolveNcaaBoxscoreSeason,
  shouldApplyBoxScoreToSeason,
} from "@/lib/basketball/season";

describe("basketball season resolution", () => {
  it("formats compact season keys across the century boundary", () => {
    assert.equal(basketballSeasonKey(2026), 202627);
    assert.equal(basketballSeasonKey(2099), 209900);
  });

  it("rolls the NBA campaign over on 1 July", () => {
    assert.equal(resolveNbaBoxscoreSeason(new Date("2026-06-30T12:00:00Z")), 202526);
    assert.equal(resolveNbaBoxscoreSeason(new Date("2026-07-01T00:00:00Z")), 202627);
    assert.equal(resolveNbaBoxscoreSeason(new Date("2027-03-15T12:00:00Z")), 202627);
    assert.equal(resolveNbaBoxscoreSeason(new Date("2027-07-02T12:00:00Z")), 202728);
  });

  it("keeps NCAA on the previous campaign until November", () => {
    assert.equal(resolveNcaaBoxscoreSeason(new Date("2026-10-03T12:00:00Z")), 202526);
    assert.equal(resolveNcaaBoxscoreSeason(new Date("2026-11-04T12:00:00Z")), 202627);
    assert.equal(resolveNcaaBoxscoreSeason(new Date("2027-04-05T12:00:00Z")), 202627);
  });

  it("attributes a game to the campaign of its tip-off, not the day it was ingested", () => {
    assert.equal(resolveNbaBoxscoreSeason(new Date("2026-03-25T00:00:00Z")), 202526);
    assert.equal(resolveNbaBoxscoreSeason(new Date("2026-04-21T00:00:00Z")), 202526);
    assert.equal(resolveNbaBoxscoreSeason(new Date("2026-10-03T12:00:00Z")), 202627);
  });

  it("keeps preseason out of season totals and counts regular season and playoffs", () => {
    const preseason = new Date("2026-10-03T12:00:00Z");
    const regular = new Date("2026-10-21T00:00:00Z");
    assert.equal(nbaGameCountsTowardSeason(preseason, 1), false);
    assert.equal(nbaGameCountsTowardSeason(preseason), false);
    assert.equal(nbaGameCountsTowardSeason(regular, 2), true);
    assert.equal(nbaGameCountsTowardSeason(new Date("2026-04-18T00:00:00Z"), 3), true);
  });

  it("does not apply a box score twice or apply a game that is outside the season totals", () => {
    assert.equal(shouldApplyBoxScoreToSeason(true, true), true);
    assert.equal(shouldApplyBoxScoreToSeason(false, true), false);
    assert.equal(shouldApplyBoxScoreToSeason(true, false), false);
  });

  it("derives the EuroLeague API code and persisted key together", () => {
    assert.deepEqual(resolveEuroLeagueSeason(new Date("2026-05-24T12:00:00Z")), {
      code: "E2025",
      year: 202526,
    });
    assert.deepEqual(resolveEuroLeagueSeason(new Date("2026-10-03T12:00:00Z")), {
      code: "E2026",
      year: 202627,
    });
  });
});
