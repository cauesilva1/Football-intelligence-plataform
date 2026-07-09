/** Shared staleness rules for external API → Supabase sync. */
export const SYNC_TTL_MS = 24 * 60 * 60 * 1000;
export const MATCH_SYNC_TTL_MS = 6 * 60 * 60 * 1000;

export function isStale(syncedAt: Date | null | undefined, ttlMs = SYNC_TTL_MS): boolean {
  if (!syncedAt) return true;
  return Date.now() - syncedAt.getTime() > ttlMs;
}

export function needsPlayerSync(player: {
  photoUrl?: string | null;
  marketValue: number;
  dataSyncedAt?: Date | null;
}): boolean {
  if (!player.photoUrl?.trim() || player.marketValue <= 0) return true;
  return isStale(player.dataSyncedAt);
}

export function needsTeamSync(team: {
  crestUrl?: string | null;
  stadium?: string | null;
  dataSyncedAt?: Date | null;
}): boolean {
  if (!team.crestUrl?.trim() || !team.stadium?.trim()) return true;
  return isStale(team.dataSyncedAt);
}

export function normalizeNameForMatch(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function namesLikelyMatch(a: string, b: string): boolean {
  const na = normalizeNameForMatch(a);
  const nb = normalizeNameForMatch(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  const aLast = na.split(" ").pop();
  const bLast = nb.split(" ").pop();
  return Boolean(aLast && bLast && aLast.length > 2 && aLast === bLast);
}
