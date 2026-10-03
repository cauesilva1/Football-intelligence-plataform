import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { soccerGoalsPer90ByRole } from "@/features/analytics/lib/build-dashboard-overview";
import type { Player } from "@/types";

function player(position: string, minutes: number, goalsPer90: number): Player {
  return {
    position,
    currentSeasonStats: {
      minutesPlayed: minutes,
      per90: { goals: goalsPer90 },
    },
  } as Player;
}

describe("soccerGoalsPer90ByRole", () => {
  it("uses mean goals per 90 so a larger midfield bucket cannot outscore attackers", () => {
    const players = [
      ...Array.from({ length: 10 }, () => player("CM", 900, 0.1)),
      player("ST", 900, 0.6),
      player("LW", 900, 0.4),
      player("CM", 90, 4),
    ];
    const byRole = Object.fromEntries(soccerGoalsPer90ByRole(players).map((row) => [row.position, row.goals]));
    assert.ok(byRole.ATT > byRole.MID);
    assert.equal(byRole.MID, 0.1);
    assert.equal(byRole.ATT, 0.5);
  });
});
