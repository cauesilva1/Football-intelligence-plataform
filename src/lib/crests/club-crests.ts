import { readCachedCrest, writeCachedCrest } from "./crest-cache";

/** API-Sports media CDN — no quota when hotlinking by known team id. */
export function apiSportsTeamLogoUrl(teamId: number): string {
  return `https://media.api-sports.io/football/teams/${teamId}.png`;
}

const CLUB_API_SPORTS_IDS: Array<{ keys: string[]; id: number }> = [
  { keys: ["real madrid"], id: 541 },
  { keys: ["arsenal"], id: 42 },
  { keys: ["barcelona", "fc barcelona"], id: 529 },
  { keys: ["atletico madrid", "atlético madrid"], id: 530 },
  { keys: ["manchester united", "man united", "man utd"], id: 33 },
  { keys: ["manchester city", "man city"], id: 50 },
  { keys: ["liverpool"], id: 40 },
  { keys: ["chelsea"], id: 49 },
  { keys: ["tottenham", "tottenham hotspur"], id: 47 },
  { keys: ["bayern", "bayern munich", "bayern münchen"], id: 157 },
  { keys: ["borussia dortmund", "dortmund"], id: 165 },
  { keys: ["juventus"], id: 496 },
  { keys: ["ac milan", "milan"], id: 489 },
  { keys: ["inter", "internazionale", "inter milan"], id: 505 },
  { keys: ["napoli"], id: 492 },
  { keys: ["roma"], id: 497 },
  { keys: ["paris saint", "psg", "paris s-g"], id: 85 },
  { keys: ["marseille"], id: 81 },
  { keys: ["lyon"], id: 80 },
  { keys: ["monaco"], id: 91 },
  { keys: ["benfica"], id: 211 },
  { keys: ["porto"], id: 212 },
  { keys: ["sporting"], id: 228 },
  { keys: ["ajax"], id: 194 },
  { keys: ["psv"], id: 197 },
  { keys: ["feyenoord"], id: 209 },
];

const TRANSFERMARKT_IDS: Array<{ keys: string[]; id: number }> = [
  { keys: ["real madrid"], id: 418 },
  { keys: ["arsenal"], id: 11 },
  { keys: ["barcelona"], id: 131 },
  { keys: ["manchester united"], id: 985 },
  { keys: ["liverpool"], id: 31 },
  { keys: ["chelsea"], id: 631 },
  { keys: ["bayern munich"], id: 27 },
  { keys: ["juventus"], id: 506 },
  { keys: ["ac milan"], id: 5 },
  { keys: ["inter"], id: 46 },
  { keys: ["borussia dortmund"], id: 16 },
  { keys: ["paris saint"], id: 583 },
];

function normalizeClubName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function resolveClubCrestUrlSync(
  teamName: string,
  crestUrl?: string | null,
  apiSportsId?: number | null
): string | null {
  if (crestUrl?.trim()) return crestUrl;
  if (apiSportsId) return apiSportsTeamLogoUrl(apiSportsId);

  const normalized = normalizeClubName(teamName);

  for (const club of CLUB_API_SPORTS_IDS) {
    if (club.keys.some((key) => normalized.includes(key))) {
      return apiSportsTeamLogoUrl(club.id);
    }
  }

  for (const club of TRANSFERMARKT_IDS) {
    if (club.keys.some((key) => normalized.includes(key))) {
      return `https://tmssl.akamaized.net/images/wappen/head/${club.id}.png`;
    }
  }

  return null;
}

export async function resolveClubCrestUrl(
  teamName: string,
  crestUrl?: string | null,
  apiSportsId?: number | null
): Promise<string | null> {
  const immediate = resolveClubCrestUrlSync(teamName, crestUrl, apiSportsId);
  if (immediate) {
    if (!crestUrl) {
      await writeCachedCrest(
        "club",
        teamName,
        immediate,
        immediate.includes("tmssl") ? "transfermarkt" : "api-sports"
      );
    }
    return immediate;
  }

  const cached = await readCachedCrest("club", teamName);
  return cached;
}
