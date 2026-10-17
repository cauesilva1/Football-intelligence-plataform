import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hockeyClubDirectoryModel } from "@/lib/hockey/club-directory";
import type { NhlStandingRow } from "@/lib/api/nhl";

const now = new Date("2026-10-17T16:00:00Z");

const knights: NhlStandingRow = {
  abbrev: "VGK",
  name: "Vegas Golden Knights",
  conference: "Western",
  division: "Pacific",
  gamesPlayed: 9,
  wins: 7,
  losses: 2,
  otLosses: 0,
  points: 14,
  regulationWins: 5,
  regulationPlusOtWins: 6,
  goalsFor: 36,
  goalsAgainst: 22,
  logoUrl: "https://assets.nhle.com/logos/nhl/svg/VGK_light.svg",
};

describe("hockey club directory", () => {
  it("uses hockey standings labels and the 2026-27 season, never soccer W/D/L/GD", () => {
    const model = hockeyClubDirectoryModel({
      shortName: "VGK",
      squadSize: 22,
      standings: [knights],
      now,
    });
    const labels = model.stats?.map((stat) => stat.label).join(" ") ?? "";
    assert.equal(labels, "GP W L OT PTS GF GA");
    assert.equal(model.stats?.find((stat) => stat.label === "PTS")?.value, 14);
    assert.equal(model.seasonLabel, "2026-27");
    assert.equal(model.rosterLabel, "22 players");
    assert.equal(model.crestUrl, knights.logoUrl);
    const text = `${labels} ${model.seasonLabel} ${model.rosterLabel}`;
    assert.equal(/\bD\b|\bGD\b|2025\/26|Season data/.test(text), false);
  });

  it("does not invent a roster count or a soccer crest when the club is not linked", () => {
    const model = hockeyClubDirectoryModel({
      shortName: "ANA",
      squadSize: 0,
      standings: [],
      now,
    });
    assert.equal(model.stats, null);
    assert.equal(model.rosterLabel, "Roster not loaded");
    assert.equal(model.crestUrl, null);
  });
});
