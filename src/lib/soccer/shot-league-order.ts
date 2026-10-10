import { ESPN_MLS_SLUG } from "@/lib/seasons";
import { SOCCER_COMPETITIONS } from "@/lib/tournaments/soccer-competitions";

/** MLS first, then the other ESPN leagues already on the soccer cron. */
export function soccerShotLeagueOrder(): string[] {
  const slugs = SOCCER_COMPETITIONS.flatMap((competition) =>
    competition.espnSlug && competition.seasonYear ? [competition.espnSlug] : []
  );
  return [ESPN_MLS_SLUG, ...slugs.filter((slug) => slug !== ESPN_MLS_SLUG)];
}

export function parseSoccerEventKey(key: string): { slug: string; eventId: string } | null {
  const match = /^espn:(.+):(\d+)$/.exec(key.trim());
  if (!match) return null;
  return { slug: match[1], eventId: match[2] };
}

/** `usa.1:761844` — the id stored on SoccerShot.gameId. */
export function soccerShotGameId(slug: string, eventId: string): string {
  return `${slug}:${eventId}`;
}
