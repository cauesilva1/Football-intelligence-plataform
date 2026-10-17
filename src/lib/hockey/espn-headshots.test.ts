import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { matchUniqueEspnHeadshots } from "@/lib/hockey/espn-headshots";

describe("ESPN NHL headshot matching", () => {
  const athletes = [
    {
      teamAbbrev: "BOS",
      fullName: "Morgan Geekie",
      headshotUrl: "https://a.espncdn.com/i/headshots/nhl/players/full/4268466.png",
    },
    {
      teamAbbrev: "UTAH",
      fullName: "Clayton Keller",
      headshotUrl: "https://a.espncdn.com/i/headshots/nhl/players/full/1.png",
    },
    {
      teamAbbrev: "CAR",
      fullName: "Sebastian Aho",
      headshotUrl: "https://a.espncdn.com/i/headshots/nhl/players/full/2.png",
    },
    {
      teamAbbrev: "CAR",
      fullName: "Sebastian Aho",
      headshotUrl: "https://a.espncdn.com/i/headshots/nhl/players/full/3.png",
    },
  ];

  it("matches a unique name on the same club and keeps the ESPN url", () => {
    const matched = matchUniqueEspnHeadshots(
      [{ id: "geekie", teamAbbrev: "BOS", fullName: "Morgan Geekie" }],
      athletes
    );
    assert.deepEqual(matched, [
      {
        id: "geekie",
        headshotUrl: "https://a.espncdn.com/i/headshots/nhl/players/full/4268466.png",
      },
    ]);
  });

  it("treats UTA and UTAH as the same club", () => {
    const matched = matchUniqueEspnHeadshots(
      [{ id: "keller", teamAbbrev: "UTA", fullName: "Clayton Keller" }],
      athletes
    );
    assert.equal(matched[0]?.headshotUrl, "https://a.espncdn.com/i/headshots/nhl/players/full/1.png");
  });

  it("leaves a duplicated name and a different club unmatched", () => {
    const matched = matchUniqueEspnHeadshots(
      [
        { id: "aho", teamAbbrev: "CAR", fullName: "Sebastian Aho" },
        { id: "other", teamAbbrev: "BOS", fullName: "Clayton Keller" },
      ],
      athletes
    );
    assert.deepEqual(matched, []);
  });
});
