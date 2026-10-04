import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveSportFromMatchId } from "@/features/matches/resolve-match-sport";
import {
  euroLeagueFixtureDraft,
  euroLeagueMatchesToSchedule,
} from "@/lib/sync/euroleague-fixtures";
import type { EuroLeagueGame } from "@/lib/api/euroleague";

const played: EuroLeagueGame = {
  gameCode: 12,
  utcDate: "2026-10-03T18:00:00Z",
  played: true,
  local: { score: 84, club: { code: "MAD", name: "Real Madrid" } },
  road: { score: 77, club: { code: "BAR", name: "FC Barcelona" } },
};

describe("euroLeagueFixtureDraft", () => {
  it("keeps a played game as a finished fixture with both scores", () => {
    const draft = euroLeagueFixtureDraft(played, "E2026");
    assert.ok(draft);
    assert.equal(draft.externalKey, "euroleague:E2026:12");
    assert.equal(draft.status, "finished");
    assert.equal(draft.homeScore, 84);
    assert.equal(draft.awayScore, 77);
    assert.equal(draft.homeName, "Real Madrid");
    assert.equal(draft.awayName, "FC Barcelona");
  });

  it("keeps an unplayed game as a scheduled fixture", () => {
    const draft = euroLeagueFixtureDraft({ ...played, played: false }, "E2026");
    assert.equal(draft?.status, "scheduled");
    assert.equal(draft?.homeScore, 0);
    assert.equal(draft?.awayScore, 0);
  });

  it("drops a game that has no clubs", () => {
    assert.equal(euroLeagueFixtureDraft({ gameCode: 1, played: true }, "E2026"), null);
  });
});

describe("euroLeagueMatchesToSchedule", () => {
  it("puts finished games on the results list", () => {
    const bundle = euroLeagueMatchesToSchedule([
      {
        externalKey: "euroleague:E2026:12",
        homeName: "Real Madrid",
        awayName: "FC Barcelona",
        homeShort: "RMB",
        awayShort: "BAR",
        homeScore: 84,
        awayScore: 77,
        status: "finished",
        matchDate: new Date("2026-10-03T18:00:00Z"),
      },
    ]);
    assert.equal(bundle.past.length, 1);
    assert.equal(bundle.past[0]?.id, "euroleague:E2026:12");
    assert.equal(bundle.past[0]?.competition, "euroleague");
    assert.equal(bundle.scheduled.length, 0);
    assert.equal(resolveSportFromMatchId(bundle.past[0]!.id), "BASKETBALL");
  });
});
