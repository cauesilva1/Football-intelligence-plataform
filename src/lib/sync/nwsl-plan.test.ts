import assert from "node:assert/strict";
import fs from "fs";
import { describe, it } from "node:test";
import { SOCCER_COMPETITIONS } from "@/lib/tournaments/soccer-competitions";
import { ESPN_NWSL_SLUG } from "@/lib/seasons";
import {
  NWSL_CRON_MAX_DURATION_SEC,
  NWSL_MIN_SQUAD,
  NWSL_SYNC_BUDGET_MS,
  nextNwslBackfillStep,
} from "./nwsl-plan";

const clubs = [
  { espnTeamId: "a", playerCount: 0 },
  { espnTeamId: "b", playerCount: 0 },
  { espnTeamId: "c", playerCount: NWSL_MIN_SQUAD },
];

describe("NWSL backfill plan", () => {
  it("fetches the club list before any roster, and only while time remains", () => {
    assert.deepEqual(
      nextNwslBackfillStep({
        teamsKnown: false,
        teams: [],
        completedTeamIds: [],
        pastDeadline: false,
      }),
      { kind: "fetch-teams" }
    );
    assert.deepEqual(
      nextNwslBackfillStep({
        teamsKnown: false,
        teams: [],
        completedTeamIds: [],
        pastDeadline: true,
      }),
      { kind: "stop", reason: "time-budget" }
    );
  });

  it("resumes at the next incomplete club and skips finished squads", () => {
    assert.deepEqual(
      nextNwslBackfillStep({
        teamsKnown: true,
        teams: clubs,
        completedTeamIds: ["a"],
        pastDeadline: false,
      }),
      { kind: "fetch-roster", espnTeamId: "b" }
    );
    assert.deepEqual(
      nextNwslBackfillStep({
        teamsKnown: true,
        teams: clubs,
        completedTeamIds: ["a", "b"],
        pastDeadline: false,
      }),
      { kind: "stop", reason: "complete" }
    );
  });

  it("stops between clubs when the time budget is gone", () => {
    assert.deepEqual(
      nextNwslBackfillStep({
        teamsKnown: true,
        teams: clubs,
        completedTeamIds: [],
        pastDeadline: true,
      }),
      { kind: "stop", reason: "time-budget" }
    );
  });

  it("keeps its own budget under a minute and out of the daily fixture list", () => {
    assert.ok(NWSL_SYNC_BUDGET_MS < NWSL_CRON_MAX_DURATION_SEC * 1000);
    assert.ok(NWSL_CRON_MAX_DURATION_SEC < 300);
    assert.equal(
      SOCCER_COMPETITIONS.some((league) => league.espnSlug === ESPN_NWSL_SLUG),
      false
    );
    const route = fs.readFileSync(
      new URL("../../app/api/cron/nwsl/route.ts", import.meta.url),
      "utf8"
    );
    assert.match(route, /export const maxDuration = 60/);
    assert.equal(NWSL_CRON_MAX_DURATION_SEC, 60);
  });
});
