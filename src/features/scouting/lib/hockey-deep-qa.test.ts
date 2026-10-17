import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { buildComparisonReport } from "@/features/comparison/lib/analysis";
import { ComparisonPlayerCards } from "@/features/comparison/components/comparison-player-cards";
import { compareToSearchParams } from "@/features/comparison/lib/parse-compare-params";
import { ScoutingTable } from "@/features/scouting/components/scouting-table";
import { filterAndSortPlayers } from "@/features/scouting/lib/filter-players";
import { findSimilarPlayers } from "@/features/scouting/lib/similarity";
import { slimListStats } from "@/features/scouting/repository/player.repository.prisma";
import { PlayerPerformanceSection } from "@/features/scouting/components/profile/player-performance-section";
import { formatSeasonLabel } from "@/lib/format/season-label";
import { acceptsTransfermarktProfile } from "@/features/scouting/repository/club.repository.prisma";
import { deriveDataDepthSnapshot } from "@/lib/intelligence/data-depth";
import { toRadarProfile } from "@/lib/normalize";
import type { Player, PlayerFilters, PlayerStatistic } from "@/types";

const SOCCER_COMPARE_COPY =
  /\bxG\b|per 90|Goals\/90|Key passes|Pass accuracy|\bCDM\b|\bST\b|\bFW\b|MID pack|ATT pack|DEF pack|\d+'/i;

function hockeyStat(overrides: Partial<PlayerStatistic> = {}): PlayerStatistic {
  return {
    id: "s",
    playerId: "p",
    teamId: "t",
    season: "202627",
    sport: "HOCKEY",
    appearances: 12,
    minutesPlayed: 12 * 1051,
    goals: 8,
    assists: 14,
    xG: 0,
    xA: 0,
    shots: 40,
    shotsOnTarget: 0,
    passes: 0,
    passAccuracy: 0,
    keyPasses: 0,
    dribblesCompleted: 0,
    tacklesWon: 0,
    interceptions: 0,
    duelsWonPct: 0,
    yellowCards: 0,
    redCards: 0,
    rating: 7.1,
    points: 22,
    plusMinus: 7,
    penaltyMinutes: 6,
    timeOnIceSeconds: 17 * 60 + 31,
    saves: 0,
    shotsAgainst: 0,
    savePercentage: 0,
    goalsAgainst: 0,
    per90: {
      goals: 8,
      assists: 14,
      shots: 0,
      keyPasses: 22,
      dribbles: 7,
      tackles: 0,
      interceptions: 0,
    },
    ...overrides,
  };
}

function hockeyPlayer(name: string, overrides: Partial<Player> = {}, stats?: Partial<PlayerStatistic>): Player {
  const currentSeasonStats = hockeyStat({ ...stats, playerId: name });
  return {
    id: name,
    fullName: name,
    knownAs: name,
    dateOfBirth: "1998-04-01",
    age: 28,
    nationality: "CAN",
    position: "C",
    height: 185,
    weight: 88,
    preferredFoot: "LEFT",
    marketValue: 0,
    sport: "HOCKEY",
    teamId: "t",
    teamName: "Vegas Golden Knights",
    teamShortName: "VGK",
    strengths: [],
    weaknesses: [],
    currentSeasonStats,
    availableSeasons: ["202627"],
    selectedSeason: "202627",
    history: [currentSeasonStats],
    ...overrides,
  };
}

describe("hockey compare", () => {
  it("uses hockey counting lines, not soccer rates or positions", () => {
    const a = hockeyPlayer("Carter Hart", { position: "G", nationality: "CAN", marketValue: 0 }, {
      goals: 0,
      assists: 0,
      points: 0,
      plusMinus: 0,
      saves: 280,
      shotsAgainst: 310,
      savePercentage: 0.917,
      goalsAgainst: 28,
      appearances: 14,
    });
    const b = hockeyPlayer("David Pastrnak", { position: "RW", nationality: "CZE", marketValue: 0 }, {
      goals: 11,
      assists: 16,
      points: 27,
      plusMinus: 4,
    });
    const report = buildComparisonReport(a, b);
    const copy = [...report.insights, ...report.advantagesA, ...report.advantagesB, report.summary].join(" ");
    assert.doesNotMatch(copy, /per 90|xG|pass accuracy|key pass/i);

    const radar = toRadarProfile(a.currentSeasonStats);
    assert.equal("Finishing" in radar, false);
    assert.equal("Creation" in radar, false);

    const html = renderToStaticMarkup(createElement(ComparisonPlayerCards, { players: [a, b] }));
    assert.doesNotMatch(html, SOCCER_COMPARE_COPY);
    assert.match(html, /Saves|SV%|GAA|Goals|Assists|Points|\+\/−|PIM|TOI/);
    assert.match(html, /CAN/);
    assert.match(html, /CZE/);
    assert.match(html, /Undisclosed/);
    assert.doesNotMatch(html, /England|Slovakia|€/);
  });

  it("does not let a soccer profile feed rewrite a hockey player", () => {
    assert.equal(acceptsTransfermarktProfile("HOCKEY"), false);
    assert.equal(acceptsTransfermarktProfile("SOCCER"), true);
  });

  it("does not print a soccer transfer value when a hockey row still carries one", () => {
    const a = hockeyPlayer("Carter Hart", { nationality: "CAN", marketValue: 75_000_000, position: "G" });
    const b = hockeyPlayer("David Pastrnak", { nationality: "CZE", marketValue: 80_000_000, position: "RW" });
    const html = renderToStaticMarkup(createElement(ComparisonPlayerCards, { players: [a, b] }));
    assert.match(html, /CAN/);
    assert.match(html, /CZE/);
    assert.doesNotMatch(html, /€|England|Slovakia/);
  });

  it("keeps the hockey desk when a player is selected", () => {
    const params = compareToSearchParams("player-a", "player-b", undefined, "hockey");
    assert.equal(params.get("desk"), "hockey");
    assert.equal(params.get("playerA"), "player-a");
    assert.equal(params.get("playerB"), "player-b");
  });
});

describe("hockey directory", () => {
  it("reorders by points and games played", () => {
    const low = hockeyPlayer("Low", {}, { points: 4, appearances: 6, goals: 1, assists: 3 });
    const high = hockeyPlayer("High", {}, { points: 27, appearances: 14, goals: 11, assists: 16 });
    const byPoints = filterAndSortPlayers([low, high], {
      sport: "HOCKEY",
      sortBy: "points",
      sortDir: "desc",
    });
    assert.equal(byPoints[0].knownAs, "High");
    const byGames = filterAndSortPlayers([low, high], {
      sport: "HOCKEY",
      sortBy: "appearances" as PlayerFilters["sortBy"],
      sortDir: "desc",
    });
    assert.equal(byGames[0].knownAs, "High");
  });

  it("exposes sortable PTS and GP headers", () => {
    const html = renderToStaticMarkup(
      createElement(ScoutingTable, {
        players: [hockeyPlayer("Ada")],
        filters: { sport: "HOCKEY", sortBy: "name", sortDir: "asc", page: 1, pageSize: 25 },
        basePath: "/players",
        route: "players",
      })
    );
    assert.match(html, /data-sort="points"/);
    assert.match(html, /data-sort="appearances"/);
  });

  it("keeps plus-minus, save percentage, and goalie position on list rows", () => {
    const goalie = slimListStats(
      hockeyStat({
        saves: 280,
        savePercentage: 0.917,
        plusMinus: 3,
        appearances: 14,
      }),
      "HOCKEY"
    );
    assert.equal(goalie.savePercentage, 0.917);
    assert.equal(goalie.plusMinus, 3);
    const skater = hockeyPlayer("Skater", { position: "D" }, { plusMinus: -2, savePercentage: 0 });
    const html = renderToStaticMarkup(
      createElement(ScoutingTable, {
        players: [
          hockeyPlayer("Adin Hill", { position: "G" }, { saves: 40, savePercentage: 0.91, plusMinus: 1, goals: 0, assists: 0, points: 0 }),
          skater,
        ],
        filters: { sport: "HOCKEY", sortBy: "name", sortDir: "asc" },
        basePath: "/players",
        route: "players",
      })
    );
    assert.match(html, /0\.910/);
    assert.match(html, />G</);
    assert.match(html, />-2</);
  });
});

describe("hockey season wording", () => {
  it("names the regular season and does not say campaign", () => {
    assert.equal(formatSeasonLabel("202627", "HOCKEY"), "2026-27 regular season");
    const html = renderToStaticMarkup(
      createElement(PlayerPerformanceSection, { player: hockeyPlayer("Ada") })
    );
    assert.match(html, /2026-27 regular season/);
    assert.doesNotMatch(html, /campaign/i);
    assert.doesNotMatch(html, /2026\/27/);
  });
});

describe("hockey profile polish", () => {
  it("does not stamp internal depth jargon on a one-season hockey profile", () => {
    const depth = deriveDataDepthSnapshot(hockeyPlayer("Ada"));
    assert.equal(depth.gapKind, "none");
    assert.doesNotMatch(depth.label, /Data gap|season depth/i);
  });

  it("does not score two different hockey lines as a perfect match", () => {
    const target = hockeyPlayer("Target", {}, { points: 20, goals: 10, assists: 10, appearances: 10 });
    const other = hockeyPlayer("Other", {}, { points: 2, goals: 1, assists: 1, appearances: 10 });
    const quiet = hockeyPlayer("Quiet", {}, { points: 0, goals: 0, assists: 0, appearances: 0, minutesPlayed: 0 });
    const alsoQuiet = hockeyPlayer("Also", {}, { points: 0, goals: 0, assists: 0, appearances: 0, minutesPlayed: 0 });
    const [different] = findSimilarPlayers(target, [other], 1);
    assert.notEqual(Math.round(different.score), 100);
    const [empty] = findSimilarPlayers(quiet, [alsoQuiet], 1);
    assert.equal(empty.comparable, false);
    const starter = hockeyPlayer(
      "Starter",
      { position: "G" },
      { appearances: 10, savePercentage: 0.91, saves: 250, goalsAgainst: 20, goals: 0, assists: 0, points: 0 }
    );
    const backup = hockeyPlayer(
      "Backup",
      { position: "G" },
      { appearances: 10, savePercentage: 0.88, saves: 200, goalsAgainst: 30, goals: 0, assists: 0, points: 0 }
    );
    const [goalies] = findSimilarPlayers(starter, [backup], 1);
    assert.notEqual(Math.round(goalies.score), 100);
  });
});
