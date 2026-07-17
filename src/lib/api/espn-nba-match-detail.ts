import type { MatchStatus } from "@/lib/tournaments/types";

export type NbaMatchCompetition = "nba" | "nba-summer" | "ncaa";

export interface BasketballMatchPlayerBoxScore {
  espnAthleteId: string;
  fullName: string;
  teamName: string;
  minutesPlayed: number;
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  fieldGoals: string;
  threePointers: string;
  freeThrows: string;
  plusMinus?: string;
}

export interface BasketballMatchDetail {
  id: string;
  competition: NbaMatchCompetition;
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
  stadiumCountry?: string;
  stageName: string;
  players: BasketballMatchPlayerBoxScore[];
  sourceLabel: string;
}

interface EspnAthleteEntry {
  didNotPlay?: boolean;
  athlete?: { id?: string; displayName?: string; fullName?: string };
  stats?: string[];
}

type EspnStatusType = {
  state?: string;
  completed?: boolean;
  name?: string;
  description?: string;
  shortDetail?: string;
  detail?: string;
};

type EspnCompetitor = {
  homeAway?: string;
  score?: string | number;
  team?: {
    displayName?: string;
    abbreviation?: string;
    logo?: string;
    logos?: Array<{ href?: string }>;
  };
};

type EspnCompetitionBlock = {
  date?: string;
  status?: {
    type?: EspnStatusType;
    period?: number;
    displayClock?: string;
  };
  competitors?: EspnCompetitor[];
  venue?: {
    fullName?: string;
    address?: { city?: string; state?: string; country?: string };
  };
};

interface EspnSummaryResponse {
  boxscore?: {
    players?: Array<{
      team?: { displayName?: string; name?: string };
      statistics?: Array<{ athletes?: EspnAthleteEntry[] }>;
    }>;
  };
  header?: {
    competitions?: EspnCompetitionBlock[];
  };
  gameInfo?: {
    venue?: {
      fullName?: string;
      address?: { city?: string; state?: string; country?: string };
    };
  };
}

interface EspnScoreboardEvent {
  id?: string;
  date?: string;
  competitions?: EspnCompetitionBlock[];
}

const ESPN_PATH: Record<NbaMatchCompetition, string> = {
  nba: "nba",
  "nba-summer": "nba-summer",
  ncaa: "mens-college-basketball",
};

const STAT = {
  minutes: 0,
  points: 1,
  fieldGoals: 2,
  threePointers: 3,
  freeThrows: 4,
  rebounds: 5,
  assists: 6,
  turnovers: 7,
  steals: 8,
  blocks: 9,
  plusMinus: 13,
} as const;

function competitionLabel(competition: NbaMatchCompetition): string {
  if (competition === "nba-summer") return "NBA Summer League";
  if (competition === "ncaa") return "NCAA Men's Basketball";
  return "NBA";
}

function stageLabel(competition: NbaMatchCompetition): string {
  if (competition === "nba-summer") return "Summer League";
  if (competition === "ncaa") return "College Basketball";
  return "Regular season";
}

function summaryUrl(competition: NbaMatchCompetition): string {
  return `https://site.api.espn.com/apis/site/v2/sports/basketball/${ESPN_PATH[competition]}/summary`;
}

function parseNumber(value?: string): number {
  if (!value?.trim() || value === "-") return 0;
  const parsed = Number.parseFloat(value.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseMinutes(value?: string): number {
  if (!value?.trim() || value === "-") return 0;
  if (value.includes(":")) {
    const [mins, secs] = value.split(":").map((part) => Number.parseInt(part, 10));
    if (Number.isFinite(mins) && Number.isFinite(secs)) {
      return Math.round(mins + secs / 60);
    }
  }
  return Math.round(parseNumber(value));
}

function shotDisplay(value?: string): string {
  if (!value?.trim() || value === "-") return "—";
  return value;
}

function parseScore(value: string | number | undefined): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number.parseInt(String(value), 10);
  return Number.isFinite(n) ? n : null;
}

function extractPlayers(summary: EspnSummaryResponse): BasketballMatchPlayerBoxScore[] {
  const rows: BasketballMatchPlayerBoxScore[] = [];

  for (const teamBlock of summary.boxscore?.players ?? []) {
    const teamName = teamBlock.team?.displayName ?? teamBlock.team?.name ?? "Unknown";
    for (const entry of teamBlock.statistics?.[0]?.athletes ?? []) {
      if (entry.didNotPlay) continue;
      const espnAthleteId = entry.athlete?.id;
      const fullName = entry.athlete?.displayName ?? entry.athlete?.fullName;
      if (!espnAthleteId || !fullName) continue;

      const stats = entry.stats ?? [];
      const minutesPlayed = parseMinutes(stats[STAT.minutes]);
      if (minutesPlayed <= 0 && parseNumber(stats[STAT.points]) <= 0) continue;

      rows.push({
        espnAthleteId,
        fullName,
        teamName,
        minutesPlayed,
        points: parseNumber(stats[STAT.points]),
        rebounds: parseNumber(stats[STAT.rebounds]),
        assists: parseNumber(stats[STAT.assists]),
        steals: parseNumber(stats[STAT.steals]),
        blocks: parseNumber(stats[STAT.blocks]),
        turnovers: parseNumber(stats[STAT.turnovers]),
        fieldGoals: shotDisplay(stats[STAT.fieldGoals]),
        threePointers: shotDisplay(stats[STAT.threePointers]),
        freeThrows: shotDisplay(stats[STAT.freeThrows]),
        plusMinus: stats[STAT.plusMinus]?.trim() || undefined,
      });
    }
  }

  return rows;
}

function mapStatus(
  type: EspnStatusType | undefined,
  period?: number,
  clock?: string
): { status: MatchStatus; label: string } {
  if (!type) return { status: "scheduled", label: "Scheduled" };
  if (type.state === "in" || type.name === "STATUS_IN_PROGRESS") {
    const clockLabel = `Q${period ?? "?"} ${clock ?? ""}`.trim();
    const label = type.shortDetail ?? type.detail ?? (clockLabel || "Live");
    return { status: "live", label };
  }
  if (type.completed || type.state === "post" || type.name === "STATUS_FINAL") {
    return { status: "finished", label: type.description ?? "Final" };
  }
  if (type.name === "STATUS_POSTPONED") {
    return { status: "postponed", label: "Postponed" };
  }
  return {
    status: "scheduled",
    label: type.shortDetail ?? type.description ?? "Scheduled",
  };
}

function formatEspnDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

function shiftDate(base: Date, days: number): Date {
  const date = new Date(base);
  date.setDate(date.getDate() + days);
  return date;
}

function teamCrest(team: EspnCompetitor["team"]): string | undefined {
  return team?.logos?.[0]?.href ?? team?.logo;
}

function buildDetailFromCompetition(
  competition: NbaMatchCompetition,
  eventId: string,
  competitionBlock: EspnCompetitionBlock,
  venueFallback?: EspnCompetitionBlock["venue"]
): BasketballMatchDetail | null {
  const competitors = competitionBlock.competitors ?? [];
  const home = competitors.find((c) => c.homeAway === "home");
  const away = competitors.find((c) => c.homeAway === "away");
  if (!home?.team?.displayName || !away?.team?.displayName) return null;

  const statusMeta = competitionBlock.status?.type;
  const mapped = mapStatus(
    statusMeta,
    competitionBlock.status?.period,
    competitionBlock.status?.displayClock
  );

  const kickOff = competitionBlock.date ?? new Date().toISOString();
  const venue = venueFallback ?? competitionBlock.venue;
  const city = venue?.address?.city;
  const state = venue?.address?.state;
  const country = venue?.address?.country;

  const homeScore = parseScore(home.score);
  const awayScore = parseScore(away.score);
  const showScore = mapped.status === "finished" || mapped.status === "live";

  return {
    id: basketballMatchExternalKey(competition, eventId),
    competition,
    competitionName: competitionLabel(competition),
    date: kickOff.slice(0, 10),
    kickOff,
    homeTeam: home.team.displayName,
    awayTeam: away.team.displayName,
    homeScore: showScore ? homeScore : null,
    awayScore: showScore ? awayScore : null,
    homeCrestUrl: teamCrest(home.team),
    awayCrestUrl: teamCrest(away.team),
    status: mapped.status,
    statusLabel: mapped.label,
    stadium: venue?.fullName ?? "—",
    stadiumCountry: [city, state, country].filter(Boolean).join(", ") || undefined,
    stageName: stageLabel(competition),
    players: [],
    sourceLabel: "ESPN",
  };
}

async function fetchScoreboardEvent(
  competition: NbaMatchCompetition,
  eventId: string
): Promise<EspnScoreboardEvent | null> {
  const slug = ESPN_PATH[competition];
  const now = new Date();
  const dateKeys = [-2, -1, 0, 1, 2].map((offset) =>
    formatEspnDate(shiftDate(now, offset))
  );

  for (const dateKey of dateKeys) {
    try {
      const response = await fetch(
        `https://site.api.espn.com/apis/site/v2/sports/basketball/${slug}/scoreboard?dates=${dateKey}`,
        {
          headers: {
            "User-Agent": "football-intelligence-platform/1.0 (nba-match-detail)",
            Accept: "application/json",
          },
          next: { revalidate: 60 },
          signal: AbortSignal.timeout(12_000),
        }
      );
      if (!response.ok) continue;
      const payload = (await response.json()) as { events?: EspnScoreboardEvent[] };
      const match = (payload.events ?? []).find((event) => event.id === eventId);
      if (match) return match;
    } catch {
      // try next date
    }
  }
  return null;
}

export function basketballMatchExternalKey(
  competition: NbaMatchCompetition,
  eventId: string
): string {
  return `espn:${competition}:${eventId}`;
}

export function parseBasketballMatchId(
  rawId: string
): { competition: NbaMatchCompetition; eventId: string } | null {
  const id = decodeURIComponent(rawId);
  const match = /^espn:(nba|nba-summer|ncaa):(.+)$/.exec(id);
  if (!match) return null;
  return { competition: match[1] as NbaMatchCompetition, eventId: match[2] };
}

export async function fetchNbaMatchDetail(
  competition: NbaMatchCompetition,
  eventId: string
): Promise<BasketballMatchDetail | null> {
  try {
    const response = await fetch(`${summaryUrl(competition)}?event=${eventId}`, {
      headers: {
        "User-Agent": "football-intelligence-platform/1.0 (nba-match-detail)",
        Accept: "application/json",
      },
      next: { revalidate: 120 },
      signal: AbortSignal.timeout(12_000),
    });

    if (response.ok) {
      const summary = (await response.json()) as EspnSummaryResponse;
      if (summary.header) {
        const competitionBlock = summary.header.competitions?.[0];
        if (competitionBlock) {
          const detail = buildDetailFromCompetition(
            competition,
            eventId,
            competitionBlock,
            summary.gameInfo?.venue
          );
          if (detail) {
            const playable =
              detail.status === "finished" || detail.status === "live";
            return {
              ...detail,
              sourceLabel: "ESPN boxscore",
              players: playable ? extractPlayers(summary) : [],
            };
          }
        }
      } else {
        console.warn(`[nba-match-detail] empty summary event=${eventId}`);
      }
    } else {
      console.warn(
        `[nba-match-detail] HTTP ${response.status} event=${eventId} — trying scoreboard`
      );
    }

    // Scheduled (and some Summer League) games often 400 on /summary; scoreboard still has the card.
    const scoreboardEvent = await fetchScoreboardEvent(competition, eventId);
    const competitionBlock = scoreboardEvent?.competitions?.[0];
    if (!competitionBlock) return null;

    if (!competitionBlock.date && scoreboardEvent?.date) {
      competitionBlock.date = scoreboardEvent.date;
    }

    return buildDetailFromCompetition(competition, eventId, competitionBlock);
  } catch (error) {
    console.warn(`[nba-match-detail] failed event=${eventId}:`, error);
    return null;
  }
}
