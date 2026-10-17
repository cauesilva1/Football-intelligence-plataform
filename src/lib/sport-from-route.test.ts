import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  deskParamForSport,
  sportFromDeskParam,
  sportFromLocation,
  withSportDesk,
} from "@/lib/sport-from-route";

describe("sportFromLocation", () => {
  it("reads the desk query on scouting and directory routes", () => {
    assert.equal(sportFromLocation("/scouting", "?desk=basketball"), "BASKETBALL");
    assert.equal(sportFromLocation("/players", "desk=football"), "AMERICAN_FOOTBALL");
    assert.equal(sportFromLocation("/scouting", "?desk=hockey"), "HOCKEY");
    assert.equal(sportFromLocation("/tournaments/nhl", ""), "HOCKEY");
    assert.equal(sportFromLocation("/dashboard", "?desk=soccer"), "SOCCER");
  });

  it("does not let a desk query override a competition or player URL", () => {
    assert.equal(sportFromLocation("/tournaments/nfl", "?desk=soccer"), "AMERICAN_FOOTBALL");
    assert.equal(sportFromLocation("/tournaments/brasileirao", ""), "SOCCER");
    assert.equal(sportFromLocation("/players/messi", "?desk=football"), null);
  });

  it("reads match ids and team league filters", () => {
    assert.equal(sportFromLocation("/matches/espn:nba:401", ""), "BASKETBALL");
    assert.equal(sportFromLocation("/teams", "?league=nfl"), "AMERICAN_FOOTBALL");
  });

  it("leaves the homepage and bare directories unscoped", () => {
    assert.equal(sportFromLocation("/", ""), null);
    assert.equal(sportFromLocation("/scouting", ""), null);
  });
});

describe("desk links", () => {
  it("maps sports to stable desk params", () => {
    assert.equal(deskParamForSport("SOCCER"), "soccer");
    assert.equal(deskParamForSport("BASKETBALL"), "basketball");
    assert.equal(deskParamForSport("AMERICAN_FOOTBALL"), "football");
    assert.equal(deskParamForSport("HOCKEY"), "hockey");
    assert.equal(sportFromDeskParam("hockey"), "HOCKEY");
    assert.equal(sportFromDeskParam("football"), "AMERICAN_FOOTBALL");
  });

  it("appends the desk without touching a player profile", () => {
    assert.equal(withSportDesk("/scouting", "BASKETBALL"), "/scouting?desk=basketball");
    assert.equal(withSportDesk("/players/abc", "SOCCER"), "/players/abc");
  });
});
