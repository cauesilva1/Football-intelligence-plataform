import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  basketballSeasonKey,
  resolveEuroLeagueSeason,
  resolveNbaBoxscoreSeason,
  resolveNcaaBoxscoreSeason,
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
