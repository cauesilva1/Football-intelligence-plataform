import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { soccerProfileLeagueLabel } from "@/lib/soccer/profile-league";

describe("soccer profile league label", () => {
  it("uses the club competition's own season", () => {
    assert.equal(soccerProfileLeagueLabel("MLS"), "MLS · 2026");
    assert.equal(soccerProfileLeagueLabel("La Liga"), "La Liga · 2026/27");
    assert.equal(soccerProfileLeagueLabel("Brasileirão Série A"), "Brasileirão Série A · 2026");
  });
});
