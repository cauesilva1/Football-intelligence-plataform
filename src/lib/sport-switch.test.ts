import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sportSwitchTarget } from "@/lib/sport-switch";

describe("sportSwitchTarget", () => {
  it("opens the desk named in the URL so a reload stays on that sport", () => {
    assert.equal(sportSwitchTarget("/dashboard", "", "BASKETBALL"), "/scouting?desk=basketball");
    assert.equal(
      sportSwitchTarget("/players/abc", "", "AMERICAN_FOOTBALL"),
      "/scouting?desk=football"
    );
    assert.equal(sportSwitchTarget("/tournaments/nfl", "", "SOCCER"), "/scouting?desk=soccer");
  });
});
