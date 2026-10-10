import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { toCanonicalShot } from "@/lib/providers/espn/espn-provider";
import {
  DEFAULT_PROVIDER_ID,
  providerEnvName,
  providerFor,
  resolveProviderId,
} from "@/lib/providers/registry";

describe("provider registry", () => {
  it("names one env var per league", () => {
    assert.equal(providerEnvName("soccer", "usa.1"), "SOCCER_MLS_PROVIDER");
    assert.equal(providerEnvName("soccer", "eng.1"), "SOCCER_PREMIER_LEAGUE_PROVIDER");
    assert.equal(providerEnvName("basketball", "nba"), "BASKETBALL_NBA_PROVIDER");
  });

  it("defaults an unset value to the current adapter", () => {
    assert.equal(resolveProviderId(undefined), DEFAULT_PROVIDER_ID);
    assert.equal(resolveProviderId("  "), DEFAULT_PROVIDER_ID);
    assert.equal(resolveProviderId("ESPN"), "espn");
  });

  it("rejects an unknown provider id", () => {
    assert.throws(() => resolveProviderId("sportmonks"), /Unknown data provider/);
  });

  it("reads the league env var when selecting an adapter", () => {
    const key = "SOCCER_MLS_PROVIDER";
    const previous = process.env[key];
    try {
      delete process.env[key];
      assert.equal(providerFor("soccer", "usa.1").id, "espn");
      process.env[key] = "espn";
      assert.equal(providerFor("soccer", "usa.1").id, "espn");
      process.env[key] = "opta";
      assert.throws(() => providerFor("soccer", "usa.1"), /Unknown data provider/);
    } finally {
      if (previous == null) delete process.env[key];
      else process.env[key] = previous;
    }
  });
});

describe("canonical shots", () => {
  it("leaves real xG empty for the current adapter", () => {
    const shot = toCanonicalShot({
      externalPlayId: "1",
      espnAthleteId: null,
      shooterName: "Lionel Messi",
      x: 88,
      y: 50,
      converted: true,
      zone: "six_yard",
      shotType: "goal",
    });
    assert.equal(shot.realXg, null);
    assert.equal(shot.x, 88);
  });
});
