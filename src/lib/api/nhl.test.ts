import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isPlausibleNhlCoordinate,
  mapNhlGameState,
  parseNhlPlayByPlayShots,
  parseNhlSchedule,
  parseNhlStandings,
} from "@/lib/api/nhl";

describe("NHL API parsing", () => {
  it("maps official game states and keeps upcoming scores empty", () => {
    assert.equal(mapNhlGameState("OFF"), "final");
    assert.equal(mapNhlGameState("LIVE"), "live");
    assert.equal(mapNhlGameState("FUT"), "scheduled");

    const parsed = parseNhlSchedule({
      previousStartDate: "2026-10-06",
      nextStartDate: "2026-10-20",
      regularSeasonStartDate: "2026-10-06",
      gameWeek: [
        {
          games: [
            {
              id: 2026020119,
              season: 20262027,
              gameState: "OFF",
              startTimeUTC: "2026-10-17T01:00:00Z",
              awayTeam: { abbrev: "PIT", commonName: { default: "Penguins" }, score: 2 },
              homeTeam: { abbrev: "COL", commonName: { default: "Avalanche" }, score: 5 },
            },
            {
              id: 2026020200,
              season: 20262027,
              gameState: "FUT",
              startTimeUTC: "2026-10-20T23:00:00Z",
              awayTeam: { abbrev: "TOR", commonName: { default: "Maple Leafs" } },
              homeTeam: { abbrev: "MTL", commonName: { default: "Canadiens" } },
            },
          ],
        },
      ],
    });

    assert.equal(parsed.games.length, 2);
    assert.equal(parsed.games[0]?.status, "final");
    assert.equal(parsed.games[0]?.homeScore, 5);
    assert.equal(parsed.games[1]?.status, "scheduled");
    assert.equal(parsed.games[1]?.awayScore, null);
  });

  it("reads standings team names from localized fields", () => {
    const rows = parseNhlStandings({
      standings: [
        {
          teamAbbrev: { default: "VGK" },
          teamName: { default: "Vegas Golden Knights" },
          conferenceName: { default: "Western" },
          divisionName: { default: "Pacific" },
          gamesPlayed: 9,
          wins: 7,
          losses: 2,
          otLosses: 0,
          points: 14,
          goalFor: 36,
          goalAgainst: 22,
          teamLogo: "https://assets.nhle.com/logos/nhl/svg/VGK_light.svg",
        },
      ],
    });
    assert.equal(rows[0]?.abbrev, "VGK");
    assert.equal(rows[0]?.points, 14);
    assert.equal(rows[0]?.logoUrl, "https://assets.nhle.com/logos/nhl/svg/VGK_light.svg");
  });

  it("keeps shot coordinates that exist and drops missing or sentinel positions", () => {
    const shots = parseNhlPlayByPlayShots(
      {
        plays: [
          {
            eventId: 12,
            typeDescKey: "shot-on-goal",
            details: { xCoord: 72, yCoord: -8, shotType: "wrist", shootingPlayerId: 8478402 },
          },
          {
            eventId: 13,
            typeDescKey: "goal",
            details: { xCoord: 80, yCoord: 2, shotType: "snap", scoringPlayerId: 8478402 },
          },
          {
            eventId: 14,
            typeDescKey: "missed-shot",
            details: { xCoord: -2_000_000_000, yCoord: 0, shootingPlayerId: 8478402 },
          },
          {
            eventId: 15,
            typeDescKey: "shot-on-goal",
            details: { shotType: "wrist", shootingPlayerId: 8478402 },
          },
          { eventId: 16, typeDescKey: "faceoff", details: { xCoord: 0, yCoord: 0 } },
        ],
      },
      "2026020119"
    );

    assert.equal(shots.length, 2);
    assert.equal(shots[0]?.made, false);
    assert.equal(shots[1]?.made, true);
    assert.equal(shots[1]?.x, 80);
    assert.equal(isPlausibleNhlCoordinate(-2_000_000_000, 0), false);
  });
});
