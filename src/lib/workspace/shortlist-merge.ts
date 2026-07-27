import type { ShortlistEntry } from "@/lib/client/browser-storage";

/** Merge local + server shortlist — newest `updatedAt` wins per player. */
export function mergeShortlistEntries(
  local: ShortlistEntry[],
  remote: ShortlistEntry[]
): ShortlistEntry[] {
  const byId = new Map<string, ShortlistEntry>();

  for (const entry of local) {
    byId.set(entry.playerId, entry);
  }

  for (const remoteEntry of remote) {
    const localEntry = byId.get(remoteEntry.playerId);
    if (!localEntry) {
      byId.set(remoteEntry.playerId, remoteEntry);
      continue;
    }

    const localTime = Date.parse(localEntry.updatedAt) || 0;
    const remoteTime = Date.parse(remoteEntry.updatedAt) || 0;
    byId.set(
      remoteEntry.playerId,
      remoteTime >= localTime
        ? {
            ...remoteEntry,
            lastBriefAt: pickNewerIso(localEntry.lastBriefAt, remoteEntry.lastBriefAt),
          }
        : {
            ...localEntry,
            lastBriefAt: pickNewerIso(localEntry.lastBriefAt, remoteEntry.lastBriefAt),
          }
    );
  }

  return [...byId.values()].sort(
    (a, b) => (Date.parse(b.updatedAt) || 0) - (Date.parse(a.updatedAt) || 0)
  );
}

function pickNewerIso(a?: string, b?: string): string | undefined {
  if (!a) return b;
  if (!b) return a;
  return (Date.parse(b) || 0) >= (Date.parse(a) || 0) ? b : a;
}
