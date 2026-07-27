import {
  getShortlistEntries,
  setShortlistEntries,
} from "@/lib/client/browser-storage";
import {
  hydrateWorkspaceShortlist,
} from "@/lib/actions/workspace";

let hydratePromise: Promise<void> | null = null;

/** Pull server shortlist once per session and merge into localStorage. */
export async function ensureWorkspaceShortlistHydrated(): Promise<void> {
  if (hydratePromise) return hydratePromise;

  hydratePromise = (async () => {
    try {
      const local = getShortlistEntries();
      const merged = await hydrateWorkspaceShortlist(local);
      if (merged.length > 0 || local.length > 0) {
        setShortlistEntries(merged);
      }
    } catch {
      /* DB unavailable — keep device-local data */
    }
  })();

  return hydratePromise;
}
