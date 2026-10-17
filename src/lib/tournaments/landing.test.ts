import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { competitionCatalog, tournamentsLanding } from "@/lib/tournaments/landing";

describe("tournaments landing", () => {
  it("renders the tournament when a desk has one, and the index when it has more", () => {
    assert.deepEqual(tournamentsLanding([{ slug: "nhl" }]), { kind: "hub", slug: "nhl" });
    assert.deepEqual(
      tournamentsLanding([{ slug: "nba" }, { slug: "ncaa" }]),
      { kind: "index" }
    );
    assert.deepEqual(tournamentsLanding([]), { kind: "index" });
  });

  it("follows each sport catalog, so a second hockey tournament would bring the index back", () => {
    const hockey = competitionCatalog("hockey");
    const basketball = competitionCatalog("basketball");
    const football = competitionCatalog("american-football");
    const soccer = competitionCatalog("soccer");

    assert.deepEqual(hockey.map((competition) => competition.slug), ["nhl"]);
    assert.equal(tournamentsLanding(hockey).kind, "hub");
    assert.ok(basketball.length > 1);
    assert.ok(football.length > 1);
    assert.ok(soccer.length > 1);
    assert.equal(tournamentsLanding(basketball).kind, "index");
    assert.equal(tournamentsLanding(football).kind, "index");
    assert.equal(tournamentsLanding(soccer).kind, "index");
  });
});
