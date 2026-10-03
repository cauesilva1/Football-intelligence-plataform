import assert from "node:assert/strict";
import test from "node:test";
import {
  buildEnrichmentPlan,
  isCoreInSeason,
  isLeagueInSeason,
  leagueProfile,
  rotationOffset,
} from "./enrichment-plan";

const OCT_3_2026 = new Date("2026-10-03T12:00:00Z");

test("European leagues, Brasileirão and MLS are core and in season in early October", () => {
  for (const label of [
    "Premier League",
    "La Liga",
    "Serie A",
    "Bundesliga",
    "Ligue 1",
    "UEFA Champions League",
    "Brasileirão Série A",
    "MLS",
  ]) {
    assert.equal(isCoreInSeason(label, OCT_3_2026), true, label);
  }
});

test("Canadian Premier League is not the Premier League and is not core", () => {
  assert.equal(leagueProfile("Premier League").priority, 1);
  assert.equal(leagueProfile("Premier League").core, true);
  const cpl = leagueProfile("Canadian Premier League");
  assert.equal(cpl.core, false);
  assert.notEqual(cpl.priority, 1);
  assert.equal(isCoreInSeason("Canadian Premier League", OCT_3_2026), false);
  assert.equal(isLeagueInSeason("Canadian Premier League", OCT_3_2026), false);
});

test("Brasileirão is not mistaken for the Italian Serie A", () => {
  assert.equal(leagueProfile("Brasileirão Série A").priority, 7);
  assert.equal(leagueProfile("Serie A").priority, 3);
});

test("calendar leagues and European leagues leave season in the right months", () => {
  const july = new Date("2026-07-10T00:00:00Z");
  assert.equal(isLeagueInSeason("Premier League", july), false);
  assert.equal(isLeagueInSeason("MLS", july), true);
  const january = new Date("2027-01-10T00:00:00Z");
  assert.equal(isLeagueInSeason("Premier League", january), true);
  assert.equal(isLeagueInSeason("MLS", january), false);
});

test("secondary competitions are never core, even in season", () => {
  assert.equal(isLeagueInSeason("CONMEBOL Libertadores", OCT_3_2026), true);
  assert.equal(isCoreInSeason("CONMEBOL Libertadores", OCT_3_2026), false);
  assert.equal(isCoreInSeason("Some Unknown Cup", OCT_3_2026), false);
});

test("plan serves core leagues first, in priority order, with budgets that never exceed the total", () => {
  const plan = buildEnrichmentPlan({
    leagues: ["MLS", "Bundesliga", "Premier League", "CONMEBOL Libertadores", "Brasileirão Série A"],
    now: OCT_3_2026,
    usableCalls: 100,
  });

  const core = plan.filter((e) => e.tier === "core").map((e) => e.league);
  assert.deepEqual(core, ["Premier League", "Bundesliga", "Brasileirão Série A", "MLS"]);
  assert.equal(plan[plan.length - 1].tier, "rotation");
  assert.equal(plan[plan.length - 1].league, "CONMEBOL Libertadores");

  const total = plan.reduce((sum, e) => sum + e.budget, 0);
  assert.equal(total, 100);
  assert.ok(plan.every((e) => e.budget > 0));
});

test("rotation slot gets a guaranteed floor but not the whole budget", () => {
  const plan = buildEnrichmentPlan({
    leagues: ["Premier League", "Libertadores Cup A"],
    now: OCT_3_2026,
    usableCalls: 20,
  });
  const rotation = plan.find((e) => e.tier === "rotation");
  assert.equal(rotation?.budget, 6);
  assert.equal(plan.find((e) => e.tier === "core")?.budget, 14);
});

test("the rotating league changes from one day to the next and cycles through all of them", () => {
  const others = ["Copa A", "Copa B", "Copa C"];
  const seen = new Set<string>();
  for (let day = 0; day < 3; day += 1) {
    const now = new Date(OCT_3_2026.getTime() + day * 86_400_000);
    const plan = buildEnrichmentPlan({
      leagues: ["Premier League", ...others],
      now,
      usableCalls: 50,
    });
    seen.add(plan.find((e) => e.tier === "rotation")!.league);
  }
  assert.equal(seen.size, 3);
});

test("with no core league in play, rotation leagues share the budget evenly", () => {
  const plan = buildEnrichmentPlan({
    leagues: ["Cup A", "Cup B", "Cup C"],
    now: OCT_3_2026,
    usableCalls: 10,
  });
  assert.equal(plan.length, 3);
  assert.deepEqual(plan.map((e) => e.budget).sort(), [3, 3, 4]);
  assert.ok(plan.every((e) => e.tier === "rotation"));
});

test("an empty or exhausted budget yields an empty plan", () => {
  assert.deepEqual(
    buildEnrichmentPlan({ leagues: ["Premier League"], now: OCT_3_2026, usableCalls: 0 }),
    []
  );
  assert.deepEqual(
    buildEnrichmentPlan({ leagues: [], now: OCT_3_2026, usableCalls: 50 }),
    []
  );
});

test("rotationOffset is stable within a day and bounded by the list size", () => {
  const morning = new Date("2026-10-03T01:00:00Z");
  const evening = new Date("2026-10-03T23:00:00Z");
  assert.equal(rotationOffset(morning, 5), rotationOffset(evening, 5));
  assert.ok(rotationOffset(morning, 5) < 5);
  assert.equal(rotationOffset(morning, 0), 0);
});
