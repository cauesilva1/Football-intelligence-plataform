import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { competitionMatchesLeagueKey } from "./team-league-filters";
import {
  buildSoccerDirectoryWhere,
  playerListedInSoccerDirectory,
} from "@/features/scouting/repository/player.repository.prisma";
import { CURRENT_SEASON } from "@/lib/seasons";

describe("soccer directory listing", () => {
  it("shows MLS, CPL and NWSL squads that have no European 2025/26 statistic row", () => {
    assert.equal(
      playerListedInSoccerDirectory({
        hasCurrentSeasonStat: false,
        competitionName: "MLS",
      }),
      true
    );
    assert.equal(
      playerListedInSoccerDirectory({
        hasCurrentSeasonStat: false,
        competitionName: "Canadian Premier League",
      }),
      true
    );
    assert.equal(
      playerListedInSoccerDirectory({
        hasCurrentSeasonStat: false,
        competitionName: "NWSL",
      }),
      true
    );
  });

  it("keeps Premier League and La Liga gated on a current-season statistic", () => {
    assert.equal(
      playerListedInSoccerDirectory({
        hasCurrentSeasonStat: false,
        competitionName: "Premier League",
      }),
      false
    );
    assert.equal(
      playerListedInSoccerDirectory({
        hasCurrentSeasonStat: true,
        competitionName: "La Liga",
      }),
      true
    );
  });

  it("filters by competition id and still ORs calendar rosters with the European season", () => {
    const where = buildSoccerDirectoryWhere({
      league: "comp-mls",
      sport: "SOCCER",
      route: "players",
      page: 1,
      pageSize: 25,
    });
    assert.deepEqual(where.team, { competitionId: "comp-mls" });
    const eligibility = (Array.isArray(where.AND) ? where.AND : [])[0];
    assert.ok(eligibility && "OR" in eligibility);
    const or = eligibility.OR as Array<Record<string, unknown>>;
    assert.deepEqual(or[0], { statistics: { some: { season: CURRENT_SEASON } } });
    const calendar = JSON.stringify(or[1]);
    assert.match(calendar, /mls/);
    assert.match(calendar, /canadian premier/);
    assert.match(calendar, /nwsl/);
    assert.equal(calendar.includes(CURRENT_SEASON), false);
  });
});

describe("league tabs", () => {
  it("does not bind the Premier League tab to the Canadian Premier League", () => {
    assert.equal(
      competitionMatchesLeagueKey("Canadian Premier League", "premier-league"),
      false
    );
    assert.equal(competitionMatchesLeagueKey("Premier League", "premier-league"), true);
    assert.equal(competitionMatchesLeagueKey("Canadian Premier League", "cpl"), true);
    assert.equal(competitionMatchesLeagueKey("MLS", "mls"), true);
    assert.equal(competitionMatchesLeagueKey("NWSL", "nwsl"), true);
    assert.equal(competitionMatchesLeagueKey("NWSL", "mls"), false);
  });
});
