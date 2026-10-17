import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyTransfermarktEnrichment } from "@/features/scouting/repository/club.repository.prisma";

const SOCCER_PATCH = {
  nationality: "England",
  position: "CDM",
  marketValue: 75_000_000,
  photoUrl: "https://img.a.transfermarkt.technology/portrait/big/1.jpg",
};

describe("Transfermarkt enrichment scope", () => {
  it("rejects hockey, basketball, and American football before any identity write", () => {
    for (const sport of ["HOCKEY", "BASKETBALL", "AMERICAN_FOOTBALL"]) {
      assert.equal(applyTransfermarktEnrichment({ sport }, SOCCER_PATCH), null);
    }
  });

  it("still applies a soccer profile", () => {
    assert.deepEqual(applyTransfermarktEnrichment({ sport: "SOCCER" }, SOCCER_PATCH), SOCCER_PATCH);
  });
});
