import assert from "node:assert/strict";
import fs from "fs";
import { describe, it } from "node:test";
import {
  CPL_CRON_MAX_DURATION_SEC,
  CPL_MIN_SQUAD,
  CPL_SYNC_BUDGET_MS,
  mapApiFootballSquadPosition,
  nextCplBackfillStep,
} from "./cpl-plan";

const clubs = [
  { apiSportsId: 1, playerCount: 0 },
  { apiSportsId: 2, playerCount: 0 },
  { apiSportsId: 3, playerCount: CPL_MIN_SQUAD },
];

describe("CPL backfill plan", () => {
  it("refuses to start when quota is at the safety floor", () => {
    assert.deepEqual(
      nextCplBackfillStep({
        teamsKnown: false,
        teams: [],
        completedTeamIds: [],
        canSpend: false,
        pastDeadline: false,
      }),
      { kind: "stop", reason: "low-quota" }
    );
  });

  it("fetches the club list before any squad, and only while time remains", () => {
    assert.deepEqual(
      nextCplBackfillStep({
        teamsKnown: false,
        teams: [],
        completedTeamIds: [],
        canSpend: true,
        pastDeadline: false,
      }),
      { kind: "fetch-teams" }
    );
    assert.deepEqual(
      nextCplBackfillStep({
        teamsKnown: false,
        teams: [],
        completedTeamIds: [],
        canSpend: true,
        pastDeadline: true,
      }),
      { kind: "stop", reason: "time-budget" }
    );
  });

  it("resumes at the next incomplete club and skips finished squads", () => {
    assert.deepEqual(
      nextCplBackfillStep({
        teamsKnown: true,
        teams: clubs,
        completedTeamIds: [1],
        canSpend: true,
        pastDeadline: false,
      }),
      { kind: "fetch-squad", apiSportsId: 2 }
    );
    assert.deepEqual(
      nextCplBackfillStep({
        teamsKnown: true,
        teams: clubs,
        completedTeamIds: [1, 2],
        canSpend: true,
        pastDeadline: false,
      }),
      { kind: "stop", reason: "complete" }
    );
  });

  it("stops between clubs when the time budget is gone", () => {
    assert.deepEqual(
      nextCplBackfillStep({
        teamsKnown: true,
        teams: clubs,
        completedTeamIds: [],
        canSpend: true,
        pastDeadline: true,
      }),
      { kind: "stop", reason: "time-budget" }
    );
  });

  it("keeps its own budget under a minute so it cannot extend the daily 300s cron", () => {
    assert.ok(CPL_SYNC_BUDGET_MS < CPL_CRON_MAX_DURATION_SEC * 1000);
    assert.ok(CPL_CRON_MAX_DURATION_SEC < 300);
    const route = fs.readFileSync(
      new URL("../../app/api/cron/cpl/route.ts", import.meta.url),
      "utf8"
    );
    assert.match(route, /export const maxDuration = 60/);
    assert.equal(CPL_CRON_MAX_DURATION_SEC, 60);
  });
});

describe("API-Football squad positions", () => {
  it("maps the four squad roles onto directory positions", () => {
    assert.equal(mapApiFootballSquadPosition("Goalkeeper"), "GK");
    assert.equal(mapApiFootballSquadPosition("Defender"), "CB");
    assert.equal(mapApiFootballSquadPosition("Midfielder"), "CM");
    assert.equal(mapApiFootballSquadPosition("Attacker"), "ST");
  });
});
