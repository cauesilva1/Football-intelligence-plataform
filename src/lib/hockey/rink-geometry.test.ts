import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { HockeyShotChart } from "@/features/scouting/components/profile/hockey-shot-chart";
import {
  buildHockeyShotChart,
  classifyHockeyZone,
  normalizeNhlAttackingCoordinate,
} from "@/lib/hockey/rink-geometry";

describe("NHL attacking coordinates", () => {
  it("folds a negative-x shot onto the same net without mirroring the wing", () => {
    assert.deepEqual(normalizeNhlAttackingCoordinate(-85, 4), { x: 85, y: -4 });
    assert.deepEqual(normalizeNhlAttackingCoordinate(87, -4), { x: 87, y: -4 });
  });

  it("drops coordinates outside the rink", () => {
    assert.equal(normalizeNhlAttackingCoordinate(-2_000_000_000, 0), null);
    assert.equal(normalizeNhlAttackingCoordinate(72, 80), null);
  });

  it("keeps a slot shot and a point shot in different areas", () => {
    assert.equal(classifyHockeyZone(80, 2), "slot");
    assert.equal(classifyHockeyZone(-80, -2), "slot");
    assert.equal(classifyHockeyZone(40, 10), "point");
  });
});

describe("hockey shot chart model", () => {
  it("normalizes both ends into one attacking half and totals the stored goals", () => {
    const model = buildHockeyShotChart({
      playerId: "p",
      selectedSeason: "202627",
      seasonLabel: "2026-27 regular season",
      seasons: [{ key: "202627", label: "2026-27 regular season" }],
      rows: [
        { x: 87, y: -4, made: false, gameId: "2026020025" },
        { x: -85, y: 4, made: true, gameId: "2026020025" },
        { x: 40, y: 10, made: false, gameId: "2026020027" },
        { x: 2_000, y: 0, made: true, gameId: "bad" },
      ],
    });

    assert.equal(model.attempts, 3);
    assert.equal(model.goals, 1);
    assert.equal(model.shootingPct, null);
    assert.equal(model.trackedGames, 2);
    assert.ok(model.shots.every((shot) => shot.x >= 0));
    assert.equal(model.shots[1]?.x, 85);
    assert.equal(model.shots[1]?.y, -4);
    assert.equal(model.zones.find((zone) => zone.zone === "slot")?.attempts, 2);
    assert.equal(model.zones.every((zone) => zone.shootingPct == null), true);
  });

  it("publishes a shooting percentage only once a zone has five shots", () => {
    const rows = Array.from({ length: 5 }, (_, index) => ({
      x: 80,
      y: index - 2,
      made: index === 0,
      gameId: "g",
    }));
    const model = buildHockeyShotChart({
      playerId: "p",
      selectedSeason: "202627",
      seasonLabel: "2026-27 regular season",
      seasons: [],
      rows,
    });
    assert.equal(model.shootingPct, 20);
    const slot = model.zones.find((zone) => zone.zone === "slot");
    assert.equal(slot?.shootingPct, 20);
    assert.notEqual(slot?.fill, "#d4d4d8");
  });
});

describe("hockey shot chart render", () => {
  it("draws every marker on the attacking side and hides the rink when nothing is stored", () => {
    const model = buildHockeyShotChart({
      playerId: "p",
      selectedSeason: "202627",
      seasonLabel: "2026-27 regular season",
      seasons: [],
      rows: [
        { x: 87, y: -4, made: false, gameId: "a" },
        { x: -80, y: 6, made: true, gameId: "a" },
      ],
    });
    const html = renderToStaticMarkup(createElement(HockeyShotChart, { model, view: "offense" }));
    assert.match(html, /data-rink-view="offense"/);
    assert.match(html, /data-outcome="goal"/);
    assert.match(html, /data-x="80"/);
    assert.doesNotMatch(html, /data-x="-/);
    const empty = buildHockeyShotChart({
      playerId: "p",
      selectedSeason: "202627",
      seasonLabel: "2026-27 regular season",
      seasons: [],
      rows: [],
    });
    const emptyHtml = renderToStaticMarkup(createElement(HockeyShotChart, { model: empty }));
    assert.match(emptyHtml, /No shot data yet/);
    assert.doesNotMatch(emptyHtml, /data-testid="hockey-shot-chart"/);
  });
});
