import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sportSwitchTarget } from "@/lib/sport-switch";

describe("sportSwitchTarget", () => {
  it("reloads the dashboard in place so the overview is not stuck on the previous sport", () => {
    assert.equal(sportSwitchTarget("/dashboard", "", "BASKETBALL"), "/dashboard");
    assert.equal(sportSwitchTarget("/dashboard", "?x=1", "AMERICAN_FOOTBALL"), "/dashboard?x=1");
  });

  it("leaves a player profile for the directory of the new sport", () => {
    assert.equal(sportSwitchTarget("/players/abc", "", "BASKETBALL"), "/players");
  });
});
