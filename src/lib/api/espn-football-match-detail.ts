import type { MatchStatus } from "@/lib/tournaments/types";

export type FootballMatchCompetition = "nfl" | "cfb";

export type FootballBoxCategory =
  | "passing"
  | "rushing"
  | "receiving"
  | "defensive"
  | "kicking";

export interface FootballBoxPlayer {
  espnAthleteId: string;
  fullName: string;
  teamName: string;
  category: FootballBoxCategory;
  /** Display cells aligned to category columns */
  cells: string[];
}

export interface FootballTeamStatLine {
  name: string;
  displayValue: string;
}

export interface FootballMatchDetail {
  id: string;
  competition: FootballMatchCompetition;
  competitionName: string;
  date: string;
  kickOff: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  homeCrestUrl?: string;
  awayCrestUrl?: string;
  status: MatchStatus;
  statusLabel: string;
  stadium: string;
  stageName: string;
  sourceLabel: string;
  players: FootballBoxPlayer[];
  homeTeamStats: FootballTeamStatLine[];
  awayTeamStats: FootballTeamStatLine[];
}

const CATEGORY_COLUMNS: Record<FootballBoxCategory, string[]> = {
  passing: ["C/ATT", "YDS", "TD", "INT", "RTG"],
  rushing: ["CAR", "YDS", "AVG", "TD", "LONG"],
  receiving: ["REC", "YDS", "TD", "LONG", "TGTS"],
  defensive: ["TOT", "SOLO", "SACKS", "TFL", "PD"],
  kicking: ["FG", "XP", "PTS"],
};

/** Which ESPN key indices to keep for each category. */
const CATEGORY_INDEX: Record<FootballBoxCategory, number[]> = {
  passing: [0, 1, 3, 4, 7],
  rushing: [0, 1, 2, 3, 4],
  receiving: [0, 1, 3, 4, 5],
  defensive: [0, 1, 2, 3, 4],
  kicking: [0, 3, 4],
};

const TRACKED_CATEGORIES: FootballBoxCategory[] = [
  "passing",
  "rushing",
  "receiving",
  "defensive",
  "kicking",
];

function summaryUrl(competition: FootballMatchCompetition, eventId: string): string {
  const slug = competition === "cfb" ? "college-football" : "nfl";
  return `https://site.api.espn.com/apis/site/v2/sports/football/${slug}/summary?event=${eventId}`;
}

export function footballMatchExternalKey(
  competition: FootballMatchCompetition,
  gameId: string
): string {
  return `espn:${competition}:${gameId}`;
}

export function parseFootballMatchExternalKey(
  id: string
): { competition: FootballMatchCompetition; eventId: string } | null {
  const decoded = decodeURIComponent(id);
  const match = /^espn:(nfl|cfb):(.+)$/.exec(decoded);
  if (!match) return null;
  return {
    competition: match[1] as FootballMatchCompetition,
    eventId: match[2],
  };
}

export function footballBoxColumns(category: FootballBoxCategory): string[] {
  return CATEGORY_COLUMNS[category];
}

function mapStatus(
  state?: string,
  name?: string,
  completed?: boolean,
  shortDetail?: string
): { status: MatchStatus; label: string } {
  if (completed || state === "post" || name === "STATUS_FINAL") {
    return { status: "finished", label: shortDetail ?? "Final" };
  }
  if (state === "in" || name === "STATUS_IN_PROGRESS") {
    return { status: "live", label: shortDetail ?? "Live" };
  }
  return { status: "scheduled", label: shortDetail ?? "Scheduled" };
}

function parseScore(value?: string | number): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number.parseInt(String(value), 10);
  return Number.isFinite(n) ? n : null;
}

interface EspnBoxAthlete {
  athlete?: { id?: string; displayName?: string; fullName?: string };
  stats?: string[];
}

interface EspnBoxStatGroup {
  name?: string;
  keys?: string[];
  labels?: string[];
  athletes?: EspnBoxAthlete[];
}

interface EspnBoxTeamPlayers {
  team?: { displayName?: string; name?: string };
  statistics?: EspnBoxStatGroup[];
}

interface EspnTeamStat {
  name?: string;
  displayName?: string;
  displayValue?: string;
  value?: number | string;
}

interface EspnSummaryResponse {
  boxscore?: {
    players?: EspnBoxTeamPlayers[];
    teams?: Array<{
      team?: { displayName?: string };
      statistics?: EspnTeamStat[];
    }>;
  };
  header?: {
    competitions?: Array<{
      date?: string;
      venue?: { fullName?: string };
      status?: {
        type?: {
          state?: string;
          completed?: boolean;
          name?: string;
          shortDetail?: string;
        };
      };
      competitors?: Array<{
        homeAway?: string;
        score?: string | number;
        team?: {
          displayName?: string;
          logos?: Array<{ href?: string }>;
        };
      }>;
    }>;
  };
  gameInfo?: { venue?: { fullName?: string } };
}

function pickCells(category: FootballBoxCategory, stats: string[] | undefined): string[] {
  const indices = CATEGORY_INDEX[category];
  return indices.map((i) => {
    const raw = stats?.[i];
    if (!raw?.trim() || raw === "-") return "—";
    return raw;
  });
}

function parsePlayers(boxPlayers: EspnBoxTeamPlayers[] | undefined): FootballBoxPlayer[] {
  const rows: FootballBoxPlayer[] = [];

  for (const teamBlock of boxPlayers ?? []) {
    const teamName = teamBlock.team?.displayName ?? teamBlock.team?.name ?? "—";
    for (const group of teamBlock.statistics ?? []) {
      const catName = (group.name ?? "").toLowerCase();
      const category = TRACKED_CATEGORIES.find((c) => c === catName);
      if (!category) continue;

      for (const entry of group.athletes ?? []) {
        const fullName =
          entry.athlete?.displayName?.trim() ||
          entry.athlete?.fullName?.trim() ||
          "";
        if (!fullName) continue;
        rows.push({
          espnAthleteId: entry.athlete?.id ?? "",
          fullName,
          teamName,
          category,
          cells: pickCells(category, entry.stats),
        });
      }
    }
  }

  return rows;
}

function parseTeamStats(
  teams:
    | Array<{
        team?: { displayName?: string };
        statistics?: EspnTeamStat[];
      }>
    | undefined,
  teamName: string
): FootballTeamStatLine[] {
  const block = (teams ?? []).find((t) => t.team?.displayName === teamName);
  const preferred = [
    "totalYards",
    "netPassingYards",
    "rushingYards",
    "firstDowns",
    "thirdDownEff",
    "totalPenaltiesYards",
    "turnovers",
    "possessionTime",
  ];

  const stats = block?.statistics ?? [];
  const lines: FootballTeamStatLine[] = [];

  for (const key of preferred) {
    const hit = stats.find((s) => s.name === key);
    if (!hit) continue;
    lines.push({
      name: hit.displayName ?? hit.name ?? key,
      displayValue: hit.displayValue ?? String(hit.value ?? "—"),
    });
  }

  if (lines.length === 0) {
    for (const hit of stats.slice(0, 8)) {
      lines.push({
        name: hit.displayName ?? hit.name ?? "—",
        displayValue: hit.displayValue ?? String(hit.value ?? "—"),
      });
    }
  }

  return lines;
}

export async function fetchFootballMatchDetail(
  competition: FootballMatchCompetition,
  eventId: string
): Promise<FootballMatchDetail | null> {
  try {
    const response = await fetch(summaryUrl(competition, eventId), {
      headers: {
        "User-Agent": "football-intelligence-platform/1.0 (football-match)",
        Accept: "application/json",
      },
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) return null;

    const data = (await response.json()) as EspnSummaryResponse;
    const comp = data.header?.competitions?.[0];
    if (!comp) return null;

    const home = comp.competitors?.find((c) => c.homeAway === "home");
    const away = comp.competitors?.find((c) => c.homeAway === "away");
    const statusMapped = mapStatus(
      comp.status?.type?.state,
      comp.status?.type?.name,
      comp.status?.type?.completed,
      comp.status?.type?.shortDetail
    );

    const homeTeam = home?.team?.displayName ?? "Home";
    const awayTeam = away?.team?.displayName ?? "Away";
    const dateIso = comp.date ?? new Date().toISOString();
    const players = parsePlayers(data.boxscore?.players);

    return {
      id: footballMatchExternalKey(competition, eventId),
      competition,
      competitionName: competition === "nfl" ? "NFL" : "College Football",
      date: dateIso.slice(0, 10),
      kickOff: dateIso,
      homeTeam,
      awayTeam,
      homeScore: parseScore(home?.score),
      awayScore: parseScore(away?.score),
      homeCrestUrl: home?.team?.logos?.[0]?.href,
      awayCrestUrl: away?.team?.logos?.[0]?.href,
      status: statusMapped.status,
      statusLabel: statusMapped.label,
      stadium: data.gameInfo?.venue?.fullName ?? comp.venue?.fullName ?? "—",
      stageName: competition === "nfl" ? "NFL" : "CFB",
      sourceLabel: "ESPN",
      players,
      homeTeamStats: parseTeamStats(data.boxscore?.teams, homeTeam),
      awayTeamStats: parseTeamStats(data.boxscore?.teams, awayTeam),
    };
  } catch (error) {
    console.warn("[football-match] fetch failed:", error);
    return null;
  }
}
