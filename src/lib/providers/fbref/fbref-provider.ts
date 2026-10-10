import { getPrisma } from "@/lib/prisma";
import { FBREF_TABLES, parseFbrefScoutPage } from "@/lib/providers/fbref/parse-scout-table";
import { fbrefScoutLeague, FBREF_SCOUT_LEAGUES } from "@/lib/providers/fbref/scout-leagues";
import type {
  CanonicalGame,
  CanonicalRosterPlayer,
  CanonicalSeasonMetric,
  DataProvider,
  PendingShotGame,
  ShotEventPage,
} from "@/lib/providers/types";

const REQUEST_GAP_MS = 4_000;
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const CACHE_PREFIX = "fbref:scout:v1:";

let nextRequestAt = 0;

async function waitForRateLimit(): Promise<void> {
  const wait = Math.max(0, nextRequestAt - Date.now());
  nextRequestAt = Date.now() + REQUEST_GAP_MS + wait;
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
}

export function fbrefTableUrl(leagueKey: string, table: (typeof FBREF_TABLES)[number]): string | null {
  const league = fbrefScoutLeague(leagueKey);
  if (!league) return null;
  return `https://fbref.com/en/comps/${league.compId}/${league.seasonPath}/${table}/${league.seasonPath}-${league.slug}-Stats`;
}

async function readCachedPage(key: string): Promise<string | null> {
  const row = await getPrisma().systemCache.findUnique({ where: { key } });
  if (!row) return null;
  const age = Date.now() - row.updatedAt.getTime();
  if (age > CACHE_TTL_MS) return null;
  const html = (row.json as { html?: unknown }).html;
  return typeof html === "string" ? html : null;
}

async function writeCachedPage(key: string, html: string): Promise<void> {
  await getPrisma().systemCache.upsert({
    where: { key },
    create: { key, json: { html } },
    update: { json: { html } },
  });
}

export async function fetchFbrefHtml(url: string): Promise<string> {
  await waitForRateLimit();
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; OmniScout/1.0; +https://omni-scout.vercel.app)",
      Accept: "text/html",
    },
    signal: AbortSignal.timeout(25_000),
  });
  if (!response.ok) throw new Error(`FBref HTTP ${response.status}`);
  const html = await response.text();
  if (/Just a moment|Um momento|security verification/i.test(html) && !html.includes("data-stat=")) {
    throw new Error("FBref blocked the request");
  }
  return html;
}

export const fbrefProvider: DataProvider = {
  id: "fbref",

  async listGames(): Promise<CanonicalGame[]> {
    return [];
  },

  async listPendingShotGames(): Promise<PendingShotGame[]> {
    return [];
  },

  async fetchShotEvents(): Promise<ShotEventPage> {
    throw new Error("FBref does not supply shot coordinates");
  },

  async fetchRoster(): Promise<CanonicalRosterPlayer[]> {
    return [];
  },

  shotCacheKey(externalEventKey: string): string {
    return `fbref:soccer:shot:v1:${externalEventKey}`;
  },

  async fetchSeasonMetrics(leagueKey: string): Promise<CanonicalSeasonMetric[]> {
    const league = fbrefScoutLeague(leagueKey);
    if (!league) return [];
    const pages: string[] = [];
    for (const table of FBREF_TABLES) {
      const url = fbrefTableUrl(leagueKey, table);
      if (!url) continue;
      const cacheKey = `${CACHE_PREFIX}${leagueKey}:${league.season}:${table}`;
      const cached = await readCachedPage(cacheKey);
      const html = cached ?? (await fetchFbrefHtml(url));
      if (!cached) await writeCachedPage(cacheKey, html);
      pages.push(html);
    }
    return pages.flatMap((html) => parseFbrefScoutPage(html, league));
  },
};

export function fbrefScoutLeagueKeys(): string[] {
  return FBREF_SCOUT_LEAGUES.map((league) => league.leagueKey);
}
