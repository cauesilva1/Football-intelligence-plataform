import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseSoccerEventKey, soccerShotGameId, soccerShotLeagueOrder } from "@/lib/soccer/shot-league-order";

describe("soccer shot league order", () => {
  it("maps MLS before the other cron leagues and does not repeat it", () => {
    const order = soccerShotLeagueOrder();
    assert.equal(order[0], "usa.1");
    assert.equal(order.filter((slug) => slug === "usa.1").length, 1);
    assert.ok(order.includes("eng.1"));
    assert.ok(order.includes("bra.1"));
    assert.ok(order.indexOf("usa.1") < order.indexOf("eng.1"));
  });

  it("splits an ESPN match key into slug and event id", () => {
    assert.deepEqual(parseSoccerEventKey("espn:usa.1:761844"), { slug: "usa.1", eventId: "761844" });
    assert.equal(soccerShotGameId("usa.1", "761844"), "usa.1:761844");
    assert.equal(parseSoccerEventKey("not-a-key"), null);
  });
});
