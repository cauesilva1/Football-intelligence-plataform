import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { matchShooterId, type ShotRosterPlayer } from "@/lib/soccer/shot-name-match";

const roster: ShotRosterPlayer[] = [
  { playerId: "messi", fullName: "Lionel Messi", knownAs: "Messi" },
  { playerId: "suarez", fullName: "Luis Suárez", knownAs: "Suárez" },
  { playerId: "david", fullName: "David Martínez", knownAs: "Martínez" },
  { playerId: "emmanuel", fullName: "Emmanuel Martínez", knownAs: "Martínez" },
  { playerId: "smith", fullName: "John Smith", knownAs: "Smith" },
];

describe("soccer shot name match", () => {
  it("matches diacritics, short names, and Jr. when one player fits", () => {
    assert.equal(matchShooterId("Luis Suarez", roster), "suarez");
    assert.equal(matchShooterId("L. Messi", roster), "messi");
    assert.equal(matchShooterId("John Smith Jr.", roster), "smith");
    assert.equal(matchShooterId("David Martínez", roster), "david");
  });

  it("leaves a shared last name unmatched", () => {
    assert.equal(matchShooterId("Martínez", roster), null);
    assert.equal(matchShooterId("Someone Else", roster), null);
  });
});
