import { normalizeNameForMatch } from "@/lib/sync/data-staleness";

const NAME_SUFFIXES = new Set(["jr", "sr", "ii", "iii", "iv", "junior", "senior"]);

export interface ShotRosterPlayer {
  playerId: string;
  fullName: string;
  knownAs: string;
}

/** Diacritics, punctuation, and generational suffixes drop out. Initials stay out. */
export function shotNameTokens(name: string): string[] {
  return normalizeNameForMatch(name)
    .split(" ")
    .filter((token) => token.length > 1 && !NAME_SUFFIXES.has(token));
}

function nameScore(shot: string[], roster: string[]): number {
  if (!shot.length || !roster.length) return 0;
  if (shot.join(" ") === roster.join(" ")) return 3;
  const shorter = shot.length <= roster.length ? shot : roster;
  const longer = shot.length <= roster.length ? roster : shot;
  const lastEqual = shot[shot.length - 1] === roster[roster.length - 1];
  if (lastEqual && shorter.length >= 2 && shorter.every((token) => longer.includes(token))) return 2;
  if (lastEqual && shorter.length === 1 && shorter[0].length > 2) return 1;
  return 0;
}

function playerScore(shot: string[], player: ShotRosterPlayer): number {
  return Math.max(
    nameScore(shot, shotNameTokens(player.fullName)),
    nameScore(shot, shotNameTokens(player.knownAs))
  );
}

/**
 * One roster player, or none. A shared last name with no fuller match stays unmatched.
 */
export function matchShooterId(name: string, roster: ShotRosterPlayer[]): string | null {
  const shot = shotNameTokens(name);
  if (!shot.length) return null;
  let best = 0;
  const winners: string[] = [];
  for (const player of roster) {
    const score = playerScore(shot, player);
    if (score <= 0) continue;
    if (score > best) {
      best = score;
      winners.length = 0;
      winners.push(player.playerId);
    } else if (score === best && !winners.includes(player.playerId)) {
      winners.push(player.playerId);
    }
  }
  return winners.length === 1 ? winners[0] : null;
}
