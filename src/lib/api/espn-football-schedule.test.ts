import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { fetchCfbScheduleBundle, fetchNflScheduleBundle } from "@/lib/api/espn-football-schedule";

type CacheGlobal = { __fipSystemCache?: Map<string, unknown> };

function event(options: {
  id: string;
  date: string;
  state: string;
  name: string;
  completed: boolean;
  homeScore?: string;
  awayScore?: string;
}) {
  return {
    id: options.id,
    name: `Away ${options.id} at Home ${options.id}`,
    date: options.date,
    competitions: [
      {
        status: {
          type: {
            state: options.state,
            name: options.name,
            completed: options.completed,
            shortDetail: options.completed ? "Final" : "Scheduled",
          },
        },
        competitors: [
          {
            homeAway: "home",
            score: options.homeScore ?? (options.completed ? "24" : "0"),
            team: { displayName: `Home ${options.id}`, abbreviation: "HOM" },
          },
          {
            homeAway: "away",
            score: options.awayScore ?? (options.completed ? "17" : "0"),
            team: { displayName: `Away ${options.id}`, abbreviation: "AWY" },
          },
        ],
      },
    ],
  };
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("football schedule results window", () => {
  const originalFetch = globalThis.fetch;
  const originalDataSource = process.env.DATA_SOURCE;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    if (originalDataSource == null) delete process.env.DATA_SOURCE;
    else process.env.DATA_SOURCE = originalDataSource;
    (globalThis as CacheGlobal).__fipSystemCache?.clear();
  });

  it("keeps prior-week finals when the current CFB week is entirely scheduled", async () => {
    process.env.DATA_SOURCE = "mock";
    (globalThis as CacheGlobal).__fipSystemCache?.clear();
    const urls: string[] = [];

    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      urls.push(url);
      const week = new URL(url).searchParams.get("week");
      if (!week) {
        return jsonResponse({
          week: { number: 7 },
          season: { year: 2026, type: 2 },
          events: [
            event({
              id: "current",
              date: "2026-10-17T23:00:00Z",
              state: "pre",
              name: "STATUS_SCHEDULED",
              completed: false,
            }),
          ],
        });
      }
      const weekNumber = Number(week);
      return jsonResponse({
        events: [
          event({
            id: `week-${weekNumber}`,
            date: `2026-09-${String(weekNumber).padStart(2, "0")}T20:00:00Z`,
            state: "post",
            name: weekNumber === 6 ? "STATUS_FINAL_OVERTIME" : "STATUS_FINAL",
            completed: weekNumber !== 6,
            homeScore: "24",
            awayScore: "17",
          }),
        ],
      });
    }) as typeof fetch;

    const bundle = await fetchCfbScheduleBundle();

    assert.equal(bundle.scheduled.length, 1);
    assert.equal(bundle.scheduled[0]?.id, "current");
    assert.equal(bundle.past.length, 6);
    assert.deepEqual(
      bundle.past.map((game) => game.id),
      ["week-6", "week-5", "week-4", "week-3", "week-2", "week-1"]
    );
    assert.equal(bundle.past[0]?.homeScore, 24);
    assert.ok(urls.some((url) => url.includes("/college-football/scoreboard?week=1")));
    assert.ok(urls.some((url) => url.includes("week=6")));
    assert.ok(urls.some((url) => url.includes("season=2026")));
    assert.ok(urls.some((url) => url.includes("seasontype=2")));
    assert.equal(urls.filter((url) => url.includes("week=")).length, 6);
  });

  it("still lists the current NFL week alongside earlier finals", async () => {
    process.env.DATA_SOURCE = "mock";
    (globalThis as CacheGlobal).__fipSystemCache?.clear();

    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      const week = new URL(url).searchParams.get("week");
      if (!week) {
        return jsonResponse({
          week: { number: 6 },
          season: { year: 2026, type: 2 },
          events: [
            event({
              id: "tnf",
              date: "2026-10-16T00:15:00Z",
              state: "post",
              name: "STATUS_FINAL",
              completed: true,
              homeScore: "31",
              awayScore: "28",
            }),
            event({
              id: "sunday",
              date: "2026-10-18T17:00:00Z",
              state: "pre",
              name: "STATUS_SCHEDULED",
              completed: false,
            }),
          ],
        });
      }
      return jsonResponse({
        events: [
          event({
            id: `nfl-${week}`,
            date: `2026-09-${String(Number(week) + 6).padStart(2, "0")}T17:00:00Z`,
            state: "post",
            name: "STATUS_FINAL",
            completed: true,
          }),
        ],
      });
    }) as typeof fetch;

    const bundle = await fetchNflScheduleBundle();
    const pastIds = bundle.past.map((game) => game.id);

    assert.equal(bundle.scheduled.map((game) => game.id).join(","), "sunday");
    assert.ok(pastIds.includes("tnf"));
    for (const week of [1, 2, 3, 4, 5]) {
      assert.ok(pastIds.includes(`nfl-${week}`), `missing week ${week}`);
    }
    assert.equal(bundle.past[0]?.id, "tnf");
    assert.equal(bundle.past[0]?.homeScore, 31);
  });
});
