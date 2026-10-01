import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { normalizePosition } from "@/etl/data-dictionary";
import {
  formatExpectedGoalsRate,
  formatMeasuredExpectedGoal,
} from "@/lib/metrics/expected-goals";
import { computeMatchRating, formatStoredMatchRating } from "@/lib/scoring/soccer-rating";
import { clubShortCode, formatClubLabel } from "@/lib/soccer/club-label";
import {
  dedupeSoccerIdentities,
  lookupFbrefIdentity,
} from "@/lib/soccer/fbref-identity";
import {
  isNationalSideDirectoryTeam,
  shouldQuarantineFixture,
} from "@/lib/soccer/fixture-integrity";

describe("fbref identity", () => {
  it("keeps one row for Anselmino and Ramsdale, on the squad with more minutes", () => {
    const anselmino = lookupFbrefIdentity("Aaron Anselmino", 2005);
    const ramsdale = lookupFbrefIdentity("Aaron Ramsdale", 1998);
    assert.ok(anselmino);
    assert.equal(anselmino.club, "Dortmund");
    assert.ok(ramsdale);
    assert.equal(ramsdale.club, "Newcastle United");

    const rows = dedupeSoccerIdentities([
      {
        id: "a",
        fullName: "Aaron Anselmino",
        dateOfBirth: "2005-01-01T00:00:00.000Z",
        teamName: "Strasbourg",
        currentSeasonStats: { minutesPlayed: 16 },
      },
      {
        id: "b",
        fullName: "Aaron Anselmino",
        dateOfBirth: "2005-01-01T00:00:00.000Z",
        teamName: "Dortmund",
        currentSeasonStats: { minutesPlayed: 368 },
      },
      {
        id: "c",
        fullName: "Aaron Ramsdale",
        dateOfBirth: "1998-05-14T00:00:00.000Z",
        teamName: "Everton",
        currentSeasonStats: { minutesPlayed: 900 },
      },
      {
        id: "d",
        fullName: "Aaron Ramsdale",
        dateOfBirth: "1998-05-14T00:00:00.000Z",
        teamName: "Newcastle United",
        currentSeasonStats: { minutesPlayed: 1004 },
      },
    ]);
    assert.deepEqual(
      rows.map((row) => row.teamName),
      ["Dortmund", "Newcastle United"]
    );
  });

  it("maps 20 well-known players off the FBref position cell", () => {
    const expected: Record<string, string> = {
      "Lamine Yamal": "ST",
      "Robert Lewandowski": "ST",
      "Andrea Belotti": "ST",
      "Armando Broja": "ST",
      "Andrea Pinamonti": "ST",
      "Aaron Ramsdale": "GK",
      "Aaron Anselmino": "CB",
      "Kylian Mbappé": "ST",
      "Erling Haaland": "ST",
      "Harry Kane": "ST",
      Pedri: "CM",
      "Vinicius Júnior": "ST",
      "Jude Bellingham": "CM",
      "Bukayo Saka": "ST",
      "Lautaro Martínez": "ST",
      "Thibaut Courtois": "GK",
      "Virgil van Dijk": "CB",
      Rodri: "CM",
      "Jamal Musiala": "ST",
      "Alexander Isak": "ST",
    };

    assert.equal(Object.keys(expected).length, 20);
    assert.equal(normalizePosition("MF,FW").primary, "ST");
    assert.equal(normalizePosition("FW").primary, "ST");
    assert.notEqual(normalizePosition("MF,FW").primary, "CM");

    for (const [name, position] of Object.entries(expected)) {
      const identity = lookupFbrefIdentity(name);
      assert.ok(identity, name);
      assert.equal(identity.position, position, name);
    }
  });
});

describe("club labels", () => {
  it("never renders NAN", () => {
    assert.equal(formatClubLabel("Nantes", "NAN"), "Nantes");
    assert.equal(formatClubLabel(null, "NAN"), "Unknown");
    assert.equal(formatClubLabel("", ""), "Unknown");
    assert.notEqual(clubShortCode("Nantes"), "NAN");
  });
});

describe("fixture integrity", () => {
  it("quarantines a European club inside Libertadores and contradictory copy", () => {
    assert.equal(
      shouldQuarantineFixture({
        competitionName: "CONMEBOL Libertadores",
        homeTeam: "United States",
        awayTeam: "Newcastle United",
        awayCountry: "England",
        stageName: "Cienciano del Cusco win 4-2 on aggregate",
      }),
      true
    );
    assert.equal(
      shouldQuarantineFixture({
        competitionName: "CONMEBOL Libertadores",
        homeTeam: "Flamengo",
        awayTeam: "Palmeiras",
        homeCountry: "Brazil",
        awayCountry: "Brazil",
        stageName: "Final",
      }),
      false
    );
  });

  it("drops national sides from the club directory", () => {
    assert.equal(
      isNationalSideDirectoryTeam({
        name: "Argentina",
        country: "Argentina",
        competitionName: "FIFA World Cup",
      }),
      true
    );
    assert.equal(
      isNationalSideDirectoryTeam({
        name: "Flamengo",
        country: "Brazil",
        competitionName: "Brasileirão Série A",
      }),
      false
    );
  });
});

describe("expected goals honesty", () => {
  it("does not print 0.00 when xG was never measured", () => {
    assert.equal(formatExpectedGoalsRate(2000, 0, 0), null);
    assert.equal(formatMeasuredExpectedGoal(0, 0, 0), null);
    assert.equal(formatMeasuredExpectedGoal(0, 1.2, 0), "0.00");
  });
});

describe("match rating honesty", () => {
  it("hides the flat 6.5 baseline", () => {
    assert.equal(
      computeMatchRating({
        minutesPlayed: 90,
        goals: 0,
        assists: 0,
        tackles: 0,
        interceptions: 0,
      }),
      null
    );
    assert.equal(
      formatStoredMatchRating(6.5, {
        goals: 0,
        assists: 0,
        tackles: 0,
        interceptions: 0,
        passesAttempted: 0,
      }),
      "—"
    );
    const scored = computeMatchRating({
      minutesPlayed: 90,
      goals: 1,
      assists: 0,
      tackles: 2,
      interceptions: 0,
    });
    assert.ok(scored != null && scored !== 6.5);
  });
});
