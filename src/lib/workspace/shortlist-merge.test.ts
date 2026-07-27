import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mergeShortlistEntries } from "@/lib/workspace/shortlist-merge";
import type { ShortlistEntry } from "@/lib/client/browser-storage";

function entry(
  playerId: string,
  note: string,
  updatedAt: string,
  tag: ShortlistEntry["tag"] = "watch"
): ShortlistEntry {
  return { playerId, tag, note, updatedAt };
}

describe("mergeShortlistEntries", () => {
  it("keeps remote when it is newer", () => {
    const local = [entry("p1", "local note", "2026-01-01T00:00:00.000Z")];
    const remote = [entry("p1", "remote note", "2026-02-01T00:00:00.000Z")];
    const merged = mergeShortlistEntries(local, remote);
    assert.equal(merged[0]?.note, "remote note");
  });

  it("keeps local when it is newer", () => {
    const local = [entry("p1", "local note", "2026-03-01T00:00:00.000Z")];
    const remote = [entry("p1", "remote note", "2026-02-01T00:00:00.000Z")];
    const merged = mergeShortlistEntries(local, remote);
    assert.equal(merged[0]?.note, "local note");
  });

  it("union players from both sides", () => {
    const local = [entry("p1", "a", "2026-01-01T00:00:00.000Z")];
    const remote = [entry("p2", "b", "2026-01-02T00:00:00.000Z")];
    const merged = mergeShortlistEntries(local, remote);
    assert.equal(merged.length, 2);
    assert.deepEqual(
      merged.map((row) => row.playerId).sort(),
      ["p1", "p2"]
    );
  });
});
