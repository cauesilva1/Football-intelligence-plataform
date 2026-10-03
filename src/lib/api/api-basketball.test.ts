import assert from "node:assert/strict";
import test from "node:test";
import {
  apiBasketballSeason,
  checkEuroLeagueOutage,
  getBasketballQuotaTracker,
  parseFinishedEuroLeagueGames,
} from "./api-basketball";

test("apiBasketballSeason formats the stored season key", () => {
  assert.equal(apiBasketballSeason(202627), "2026-2027");
  assert.equal(apiBasketballSeason(202526), "2025-2026");
});

test("parseFinishedEuroLeagueGames keeps only finished EuroLeague games", () => {
  const games = parseFinishedEuroLeagueGames([
    {
      date: "2026-10-02T18:30:00+00:00",
      status: { short: "FT" },
      league: { id: 120, name: "Euroleague" },
      teams: { home: { name: "Real Madrid" }, away: { name: "Olympiacos" } },
      scores: { home: { total: 88 }, away: { total: 81 } },
    },
    {
      date: "2026-10-02T20:00:00+00:00",
      status: { short: "NS" },
      league: { id: 120, name: "Euroleague" },
      teams: { home: { name: "A" }, away: { name: "B" } },
      scores: { home: { total: null }, away: { total: null } },
    },
    {
      date: "2026-10-02T20:00:00+00:00",
      status: { short: "FT" },
      league: { id: 12, name: "NBA" },
      teams: { home: { name: "C" }, away: { name: "D" } },
      scores: { home: { total: 100 }, away: { total: 90 } },
    },
    {
      date: "2026-10-02T21:00:00+00:00",
      status: { short: "AOT" },
      league: { id: 120, name: "Euroleague" },
      teams: { home: { name: "Barcelona" }, away: { name: "Fenerbahce" } },
      scores: { home: { total: 95 }, away: { total: 93 } },
    },
  ]);

  assert.equal(games.length, 2);
  assert.deepEqual(
    games.map((g) => `${g.home}-${g.away}`),
    ["Real Madrid-Olympiacos", "Barcelona-Fenerbahce"]
  );
  assert.equal(games[0].homeScore, 88);
});

test("parseFinishedEuroLeagueGames never throws on unexpected payloads", () => {
  assert.deepEqual(parseFinishedEuroLeagueGames(null), []);
  assert.deepEqual(parseFinishedEuroLeagueGames({ not: "an array" }), []);
  assert.deepEqual(parseFinishedEuroLeagueGames([null, 3, "x", {}]), []);
});

test("outage check spends no quota and reports the skip when the key is missing", async () => {
  const previous = process.env.APISPORTS_BASKETBALL_KEY;
  delete process.env.APISPORTS_BASKETBALL_KEY;
  try {
    const before = getBasketballQuotaTracker().callCount;
    const report = await checkEuroLeagueOutage({
      reason: "EuroLeague API HTTP 503",
      now: new Date("2026-10-03T12:00:00Z"),
    });
    assert.equal(report.skipped, "no-api-key");
    assert.equal(report.finishedGames, 0);
    assert.equal(getBasketballQuotaTracker().callCount, before);
    assert.ok(getBasketballQuotaTracker().snapshot().skipped >= 1);
  } finally {
    if (previous !== undefined) process.env.APISPORTS_BASKETBALL_KEY = previous;
  }
});
