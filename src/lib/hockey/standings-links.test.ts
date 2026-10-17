import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DivisionStandings } from "@/features/tournaments/hockey-competition-hub";
import { attachNhlClubIds } from "@/lib/hockey/standings";
import type { NhlStandingRow } from "@/lib/api/nhl";

function row(partial: Pick<NhlStandingRow, "abbrev" | "name" | "division" | "conference"> & Partial<NhlStandingRow>): NhlStandingRow {
  return {
    gamesPlayed: 8,
    wins: 4,
    losses: 3,
    otLosses: 1,
    points: 9,
    regulationWins: 3,
    regulationPlusOtWins: 4,
    goalsFor: 20,
    goalsAgainst: 18,
    ...partial,
  };
}

describe("NHL standings club links", () => {
  it("renders a real club link in every division group and in the wild card table", () => {
    const linked = attachNhlClubIds(
      [
        row({ abbrev: "BOS", name: "Boston Bruins", division: "Atlantic", conference: "Eastern", points: 12 }),
        row({ abbrev: "OTT", name: "Ottawa Senators", division: "Atlantic", conference: "Eastern", points: 11 }),
        row({ abbrev: "TBL", name: "Tampa Bay Lightning", division: "Atlantic", conference: "Eastern", points: 10 }),
        row({ abbrev: "FLA", name: "Florida Panthers", division: "Atlantic", conference: "Eastern", points: 9 }),
        row({ abbrev: "CAR", name: "Carolina Hurricanes", division: "Metropolitan", conference: "Eastern", points: 13 }),
        row({ abbrev: "NYR", name: "New York Rangers", division: "Metropolitan", conference: "Eastern", points: 12 }),
        row({ abbrev: "WSH", name: "Washington Capitals", division: "Metropolitan", conference: "Eastern", points: 8 }),
        row({ abbrev: "NJD", name: "New Jersey Devils", division: "Metropolitan", conference: "Eastern", points: 7 }),
        row({ abbrev: "UTA", name: "Utah Mammoth", division: "Central", conference: "Western", points: 12 }),
        row({ abbrev: "COL", name: "Colorado Avalanche", division: "Central", conference: "Western", points: 11 }),
        row({ abbrev: "MIN", name: "Minnesota Wild", division: "Central", conference: "Western", points: 10 }),
        row({ abbrev: "WPG", name: "Winnipeg Jets", division: "Central", conference: "Western", points: 9 }),
        row({ abbrev: "VGK", name: "Vegas Golden Knights", division: "Pacific", conference: "Western", points: 14 }),
        row({ abbrev: "EDM", name: "Edmonton Oilers", division: "Pacific", conference: "Western", points: 11 }),
        row({ abbrev: "SEA", name: "Seattle Kraken", division: "Pacific", conference: "Western", points: 10 }),
        row({ abbrev: "ANA", name: "Anaheim Ducks", division: "Pacific", conference: "Western", points: 8 }),
      ],
      [
        { id: "club-bos", shortName: "BOS" },
        { id: "club-car", shortName: "CAR" },
        { id: "club-uta", shortName: "UTA" },
        { id: "club-vgk", shortName: "VGK" },
        { id: "club-fla", shortName: "FLA" },
        { id: "club-wpg", shortName: "WPG" },
      ]
    );
    const html = renderToStaticMarkup(createElement(DivisionStandings, { rows: linked }));
    for (const href of [
      "/teams/club-bos",
      "/teams/club-car",
      "/teams/club-uta",
      "/teams/club-vgk",
      "/teams/club-fla",
      "/teams/club-wpg",
    ]) {
      assert.equal(html.includes(`href="${href}"`), true, href);
    }
    assert.equal((html.match(/<a /g) ?? []).length >= 6, true);
    assert.match(html, /hover:text-primary/);
    assert.match(html, /focus-visible:ring-2/);
  });

  it("does not invent a link when the club id is missing", () => {
    const html = renderToStaticMarkup(
      createElement(DivisionStandings, {
        rows: attachNhlClubIds(
          [row({ abbrev: "BOS", name: "Boston Bruins", division: "Atlantic", conference: "Eastern" })],
          []
        ),
      })
    );
    assert.equal(html.includes("<a "), false);
    assert.match(html, /Boston Bruins/);
  });
});
