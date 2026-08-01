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
  { keys: ["inter milan", "internazionale", "fc internazionale"], id: 505 },
  // Exact "inter" alone — only after longer names; avoid matching Brazilian Internacional
  { keys: ["^inter$"], id: 505 },
  { keys: ["internacional"], id: 119 },
  { keys: ["inter miami"], id: 9568 },
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
  { keys: ["newcastle"], id: 34 },
  { keys: ["aston villa"], id: 66 },
  { keys: ["west ham"], id: 48 },
  { keys: ["brighton"], id: 51 },
  { keys: ["wolverhampton", "wolves"], id: 39 },
  { keys: ["everton"], id: 45 },
  { keys: ["crystal palace"], id: 52 },
  { keys: ["fulham"], id: 36 },
  { keys: ["brentford"], id: 55 },
  { keys: ["nottingham", "forest"], id: 65 },
  { keys: ["bournemouth"], id: 35 },
  { keys: ["leicester"], id: 46 },
  { keys: ["southampton"], id: 41 },
  { keys: ["ipswich"], id: 57 },
  { keys: ["sevilla"], id: 536 },
  { keys: ["real sociedad"], id: 548 },
  { keys: ["athletic club", "athletic bilbao"], id: 531 },
  { keys: ["villarreal"], id: 533 },
  { keys: ["real betis", "betis"], id: 543 },
  { keys: ["valencia"], id: 532 },
  { keys: ["celta"], id: 538 },
  { keys: ["getafe"], id: 546 },
  { keys: ["girona"], id: 547 },
  { keys: ["osasuna"], id: 727 },
  { keys: ["mallorca"], id: 798 },
  { keys: ["las palmas"], id: 534 },
  { keys: ["leganes", "leganés"], id: 537 },
  { keys: ["alaves", "alavés"], id: 542 },
  { keys: ["espanyol"], id: 540 },
  { keys: ["valladolid"], id: 720 },
  { keys: ["leverkusen", "bayer"], id: 168 },
  { keys: ["leipzig", "rb leipzig"], id: 173 },
  { keys: ["frankfurt", "eintracht"], id: 169 },
  { keys: ["wolfsburg"], id: 161 },
  { keys: ["monchengladbach", "mönchengladbach", "gladbach"], id: 163 },
  { keys: ["freiburg"], id: 160 },
  { keys: ["hoffenheim"], id: 167 },
  { keys: ["stuttgart"], id: 172 },
  { keys: ["werder bremen", "bremen"], id: 162 },
  { keys: ["augsburg"], id: 170 },
  { keys: ["mainz"], id: 164 },
  { keys: ["union berlin"], id: 182 },
  { keys: ["heidenheim"], id: 180 },
  { keys: ["bochum"], id: 176 },
  { keys: ["st pauli", "st. pauli"], id: 186 },
  { keys: ["holstein kiel", "kiel"], id: 191 },
  { keys: ["lazio"], id: 487 },
  { keys: ["atalanta"], id: 499 },
  { keys: ["fiorentina"], id: 502 },
  { keys: ["torino"], id: 503 },
  { keys: ["bologna"], id: 500 },
  { keys: ["udinese"], id: 494 },
  { keys: ["genoa"], id: 495 },
  { keys: ["cagliari"], id: 490 },
  { keys: ["empoli"], id: 511 },
  { keys: ["monza"], id: 1579 },
  { keys: ["lecce"], id: 867 },
  { keys: ["verona", "hellas"], id: 504 },
  { keys: ["como"], id: 895 },
  { keys: ["parma"], id: 523 },
  { keys: ["venezia"], id: 517 },
  { keys: ["lille"], id: 79 },
  { keys: ["nice"], id: 84 },
  { keys: ["rennes"], id: 94 },
  { keys: ["lens"], id: 116 },
  { keys: ["strasbourg"], id: 95 },
  { keys: ["nantes"], id: 83 },
  { keys: ["reims"], id: 93 },
  { keys: ["toulouse"], id: 96 },
  { keys: ["montpellier"], id: 82 },
  { keys: ["brest"], id: 106 },
  { keys: ["auxerre"], id: 108 },
  { keys: ["angers"], id: 77 },
  { keys: ["le havre"], id: 111 },
  { keys: ["saint-etienne", "saint etienne", "st-etienne"], id: 1063 },
  { keys: ["paris fc"], id: 114 },
  { keys: ["leeds"], id: 63 },
  { keys: ["sunderland"], id: 746 },
  { keys: ["hamburger", "hamburg"], id: 175 },
  { keys: ["koln", "köln", "cologne"], id: 192 },
  { keys: ["levante"], id: 539 },
  { keys: ["oviedo"], id: 718 },
  { keys: ["rayo vallecano", "rayo"], id: 728 },
  { keys: ["pisa"], id: 801 },
  { keys: ["corinthians"], id: 131 },
  { keys: ["palmeiras"], id: 121 },
  { keys: ["santos"], id: 128 },
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

/** Resolve a known API-Football team id from our static club map (no network). */
export function lookupClubApiSportsId(teamName: string): number | null {
  const normalized = normalizeClubName(teamName);
  // Prefer longer/more specific keys first to avoid "inter" matching "internacional".
  const ranked = [...CLUB_API_SPORTS_IDS].sort(
    (a, b) =>
      Math.max(...b.keys.map((k) => k.replace(/^\^|\$$/g, "").length)) -
      Math.max(...a.keys.map((k) => k.replace(/^\^|\$$/g, "").length))
  );
  for (const club of ranked) {
    for (const key of club.keys) {
      if (key.startsWith("^") && key.endsWith("$")) {
        if (normalized === key.slice(1, -1)) return club.id;
        continue;
      }
      if (normalized.includes(key)) return club.id;
    }
  }
  return null;
}

export function resolveClubCrestUrlSync(
  teamName: string,
  crestUrl?: string | null,
  apiSportsId?: number | null
): string | null {
  if (crestUrl?.trim()) return crestUrl;
  if (apiSportsId) return apiSportsTeamLogoUrl(apiSportsId);

  const mappedId = lookupClubApiSportsId(teamName);
  if (mappedId) return apiSportsTeamLogoUrl(mappedId);

  const normalized = normalizeClubName(teamName);
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
