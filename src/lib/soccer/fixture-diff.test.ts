import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isFixtureUnchanged, type IncomingFixtureRow, type StoredFixtureRow } from "./fixture-diff";

const stored: StoredFixtureRow = {
  homeTeamId: "h",
  awayTeamId: "a",
  homeScore: 2,
  awayScore: 1,
  matchDate: new Date("2026-09-20T19:00:00Z"),
  round: "Matchday 5",
  status: "finished",
  seasonLabel: "2026/27",
  competitionId: "c1",
};

const incoming: IncomingFixtureRow = {
  homeTeamId: "h",
  awayTeamId: "a",
  homeScore: 2,
  awayScore: 1,
  matchDate: new Date("2026-09-20T19:00:00Z"),
  round: "Matchday 5",
  status: "finished",
  seasonLabel: "2026/27",
  competitionId: "c1",
};

describe("isFixtureUnchanged", () => {
  it("is false when the row does not exist yet", () => {
    assert.equal(isFixtureUnchanged(null, incoming), false);
  });

  it("is true for an identical row", () => {
    assert.equal(isFixtureUnchanged(stored, incoming), true);
  });

  it("detects score, status, kickoff and team changes", () => {
    assert.equal(isFixtureUnchanged(stored, { ...incoming, awayScore: 2 }), false);
    assert.equal(isFixtureUnchanged(stored, { ...incoming, status: "live" }), false);
    assert.equal(
      isFixtureUnchanged(stored, { ...incoming, matchDate: new Date("2026-09-20T20:00:00Z") }),
      false
    );
    assert.equal(isFixtureUnchanged(stored, { ...incoming, homeTeamId: "x" }), false);
  });

  it("treats missing round as null on both sides", () => {
    assert.equal(
      isFixtureUnchanged({ ...stored, round: null }, { ...incoming, round: undefined }),
      true
    );
  });

  it("does not require a competition when the incoming one is unresolved", () => {
    assert.equal(isFixtureUnchanged(stored, { ...incoming, competitionId: null }), true);
  });
});
