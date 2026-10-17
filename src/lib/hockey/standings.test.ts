import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { groupNhlStandings, type NhlStandingsTeam } from "@/lib/hockey/standings";

function team(partial: Partial<NhlStandingsTeam> & Pick<NhlStandingsTeam, "abbrev" | "division" | "conference">): NhlStandingsTeam {
  return {
    name: partial.abbrev,
    gamesPlayed: 10,
    wins: 5,
    losses: 4,
    otLosses: 1,
    points: 10,
    regulationWins: 4,
    regulationPlusOtWins: 5,
    goalsFor: 30,
    goalsAgainst: 28,
    ...partial,
  };
}

describe("NHL division standings", () => {
  it("breaks point ties by points percentage, then regulation wins, then regulation plus overtime wins", () => {
    const grouped = groupNhlStandings([
      team({ abbrev: "CGY", division: "Pacific", conference: "Western", points: 2, gamesPlayed: 7, regulationWins: 1, regulationPlusOtWins: 1, wins: 1 }),
      team({ abbrev: "LAK", division: "Pacific", conference: "Western", points: 2, gamesPlayed: 5, regulationWins: 0, regulationPlusOtWins: 0, wins: 0 }),
      team({ abbrev: "SEA", division: "Pacific", conference: "Western", points: 11, gamesPlayed: 8, regulationWins: 4, regulationPlusOtWins: 4, wins: 5 }),
      team({ abbrev: "EDM", division: "Pacific", conference: "Western", points: 11, gamesPlayed: 8, regulationWins: 5, regulationPlusOtWins: 5, wins: 5 }),
      team({ abbrev: "VAN", division: "Pacific", conference: "Western", points: 8, gamesPlayed: 8, regulationWins: 2, regulationPlusOtWins: 3, wins: 3 }),
      team({ abbrev: "ANA", division: "Pacific", conference: "Western", points: 8, gamesPlayed: 8, regulationWins: 2, regulationPlusOtWins: 4, wins: 4 }),
    ]);
    const pacific = grouped.divisions.find((group) => group.division === "Pacific");
    assert.deepEqual(
      pacific?.teams.map((row) => row.abbrev),
      ["EDM", "SEA", "ANA", "VAN", "LAK", "CGY"]
    );
  });

  it("marks the top 3 of each division and the next 2 in each conference as wild cards", () => {
    const rows = [
      ...["A1", "A2", "A3", "A4", "A5"].map((abbrev, index) =>
        team({ abbrev, division: "Atlantic", conference: "Eastern", points: [20, 19, 18, 12, 11][index] ?? 0 })
      ),
      ...["M1", "M2", "M3", "M4", "M5"].map((abbrev, index) =>
        team({ abbrev, division: "Metropolitan", conference: "Eastern", points: [18, 17, 16, 15, 10][index] ?? 0 })
      ),
      ...["C1", "C2", "C3", "C4"].map((abbrev, index) =>
        team({ abbrev, division: "Central", conference: "Western", points: 16 - index })
      ),
      ...["P1", "P2", "P3", "P4"].map((abbrev, index) =>
        team({ abbrev, division: "Pacific", conference: "Western", points: 15 - index })
      ),
    ];
    const grouped = groupNhlStandings(rows);
    assert.deepEqual(
      grouped.divisions.map((group) => group.division),
      ["Atlantic", "Metropolitan", "Central", "Pacific"]
    );
    for (const group of grouped.divisions) {
      assert.deepEqual(
        group.teams.filter((row) => row.playoff).map((row) => row.abbrev),
        group.teams.slice(0, 3).map((row) => row.abbrev)
      );
    }
    const seen = grouped.divisions.flatMap((group) => group.teams.map((row) => `${group.division}:${row.abbrev}`));
    assert.equal(new Set(seen).size, seen.length);
    assert.deepEqual(
      grouped.wildCards.map((race) => ({
        conference: race.conference,
        teams: race.teams.map((row) => row.abbrev),
      })),
      [
        { conference: "Eastern", teams: ["M4", "A4"] },
        { conference: "Western", teams: ["C4", "P4"] },
      ]
    );
  });
});
