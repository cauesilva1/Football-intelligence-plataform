import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isCronAuthorized } from "@/lib/cron/authorize-request";
import { clientAddressFromHeaders } from "@/lib/rate-limit";
import {
  SHORTLIST_ENTRY_CAP,
  SHORTLIST_NOTE_CAP,
  capShortlistPayload,
} from "@/lib/workspace/shortlist-store";
import type { ShortlistEntry } from "@/lib/client/browser-storage";

function headers(map: Record<string, string>): { get(name: string): string | null } {
  return {
    get(name: string) {
      return map[name.toLowerCase()] ?? null;
    },
  };
}

describe("client address", () => {
  it("uses the Vercel platform address and ignores a spoofed forwarded-for hop", () => {
    const address = clientAddressFromHeaders(
      headers({
        "x-forwarded-for": "1.2.3.4, 9.9.9.9",
        "x-vercel-forwarded-for": "203.0.113.8",
        "x-real-ip": "198.51.100.4",
      })
    );
    assert.equal(address, "203.0.113.8");
  });

  it("falls back to x-real-ip and then a shared anonymous bucket", () => {
    assert.equal(
      clientAddressFromHeaders(headers({ "x-real-ip": "198.51.100.4", "x-forwarded-for": "1.2.3.4" })),
      "198.51.100.4"
    );
    assert.equal(clientAddressFromHeaders(headers({ "x-forwarded-for": "1.2.3.4" })), "anonymous");
  });
});

describe("cron authorization", () => {
  it("accepts the bearer secret even when the guess has a different length", () => {
    const previous = process.env.CRON_SECRET;
    process.env.CRON_SECRET = "short-secret";
    try {
      const ok = new Request("http://localhost/api/cron/soccer", {
        headers: { authorization: "Bearer short-secret" },
      });
      const wrongLength = new Request("http://localhost/api/cron/soccer", {
        headers: { authorization: "Bearer short-secret-extra" },
      });
      assert.equal(isCronAuthorized(ok), true);
      assert.equal(isCronAuthorized(wrongLength), false);
    } finally {
      if (previous === undefined) delete process.env.CRON_SECRET;
      else process.env.CRON_SECRET = previous;
    }
  });
});

describe("shortlist caps", () => {
  it("keeps the last 200 entries and trims notes", () => {
    const entries: ShortlistEntry[] = Array.from({ length: SHORTLIST_ENTRY_CAP + 25 }, (_, index) => ({
      playerId: `p${index}`,
      tag: "watch",
      note: "n".repeat(SHORTLIST_NOTE_CAP + 40),
      updatedAt: "2026-01-01T00:00:00.000Z",
    }));
    const capped = capShortlistPayload(entries);
    assert.equal(capped.length, SHORTLIST_ENTRY_CAP);
    assert.equal(capped[0]?.playerId, "p25");
    assert.equal(capped.at(-1)?.playerId, `p${SHORTLIST_ENTRY_CAP + 24}`);
    assert.equal(capped[0]?.note.length, SHORTLIST_NOTE_CAP);
  });
});
