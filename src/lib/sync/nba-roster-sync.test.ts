import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPlayerSlug,
  isActiveRosterAthlete,
  mapNbaPosition,
  orderTeamsByStaleness,
  specificPositionsFromDepthChart,
} from "./nba-roster-sync";

test("orderTeamsByStaleness puts never-synced teams first, then oldest", () => {
  const teams = [{ key: "1" }, { key: "2" }, { key: "3" }, { key: "4" }];
  const lastSync = new Map([
    ["1", 3000],
    ["3", 1000],
    ["4", 2000],
  ]);

  const ordered = orderTeamsByStaleness(teams, lastSync).map((t) => t.key);
  assert.deepEqual(ordered, ["2", "3", "4", "1"]);
});

test("orderTeamsByStaleness does not mutate the input", () => {
  const teams = [{ key: "b" }, { key: "a" }];
  orderTeamsByStaleness(teams, new Map([["b", 5]]));
  assert.deepEqual(teams.map((t) => t.key), ["b", "a"]);
});

test("depth chart assigns the five positions and leaves unlisted players alone", () => {
  const positions = specificPositionsFromDepthChart({
    depthchart: [
      {
        positions: {
          pg: { athletes: [{ id: "1" }, { id: "2" }] },
          pf: { athletes: [{ id: "3" }] },
          sf: { athletes: [{ id: "3" }] },
        },
      },
    ],
  });
  assert.equal(positions.get("1"), "PG");
  assert.equal(positions.get("2"), "PG");
  assert.equal(positions.get("3"), "PF");
  assert.equal(mapNbaPosition("Guard"), "G");
  assert.equal(positions.has("9"), false);
});

test("isActiveRosterAthlete accepts active or status-less athletes only", () => {
  assert.equal(isActiveRosterAthlete({ id: "1", status: { type: "active" } }), true);
  assert.equal(isActiveRosterAthlete({ id: "2" }), true);
  assert.equal(isActiveRosterAthlete({ id: "3", status: { type: "inactive", name: "Out" } }), false);
});

test("mapNbaPosition and buildPlayerSlug normalize ESPN values", () => {
  assert.equal(mapNbaPosition("Point Guard"), "PG");
  assert.equal(mapNbaPosition("Shooting Guard"), "SG");
  assert.equal(mapNbaPosition("Guard"), "G");
  assert.equal(mapNbaPosition("G"), "G");
  assert.equal(mapNbaPosition("Center"), "C");
  assert.equal(mapNbaPosition("Forward"), "SF");
  assert.equal(mapNbaPosition("Power Forward"), "PF");
  assert.equal(mapNbaPosition("Small Forward"), "SF");
  assert.equal(buildPlayerSlug("Nikola Jokić"), "nikola-jokic");
});
