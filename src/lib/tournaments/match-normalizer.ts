import type { StatsBombMatch } from "@/lib/statsbomb/types";
import { STAGE_ORDER } from "@/lib/statsbomb/constants";
import type { MatchStatus, PhaseFilterKey, TournamentMatch } from "./types";

export function resolvePhaseKey(stageName: string): PhaseFilterKey {
  const n = stageName.toLowerCase();
  if (n.includes("group")) return "group";
  if (n.includes("round of 32")) return "r16"; // WC 2026 first knockout wave
  if (n.includes("round of 16") || n.includes("oitavas")) return "r16";
  if (n.includes("quarter")) return "quarter";
  if (n.includes("semi")) return "semi";
  if (n.includes("third")) return "final";
  if (n.includes("final") && !n.includes("semi") && !n.includes("quarter")) return "final";
  return "group";
}

export function normalizeApiSportsRound(round?: string | null): string {
  if (!round) return "Outros";
  const r = round.toLowerCase();
  if (r.includes("group")) return "Group Stage";
  if (r.includes("round of 16")) return "Round of 16";
  if (r.includes("quarter")) return "Quarter-finals";
  if (r.includes("semi")) return "Semi-finals";
  if (r.includes("3rd") || r.includes("third")) return "Third Place";
  if (r === "final" || r.endsWith("final")) return "Final";
  return round;
}

function mapStatsBombStatus(match: StatsBombMatch): { status: MatchStatus; statusLabel: string } {
  const raw = match.match_status?.toLowerCase();

  if (raw === "live" || raw === "in") {
    return { status: "live", statusLabel: "Live" };
  }

  if (raw === "available" || raw === "played" || raw === "finished") {
    return { status: "finished", statusLabel: "Finished" };
  }

  if (raw === "postponed" || raw === "cancelled") {
    return { status: "postponed", statusLabel: "Postponed" };
  }

  return { status: "scheduled", statusLabel: "Scheduled" };
}

export function fromStatsBombMatch(match: StatsBombMatch, source: TournamentMatch["source"] = "statsbomb"): TournamentMatch {
  const stageName = match.competition_stage?.name ?? "Outros";
  const { status, statusLabel } = mapStatsBombStatus(match);
  const espnEventId = match.metadata?.espn_event_id;
  const id =
    espnEventId != null && String(espnEventId).length > 0
      ? `espn:fifa.world:${espnEventId}`
      : `sb-${match.match_id}`;

  return {
    id,
    source,
    date: match.match_date,
    kickOff: match.kick_off,
    homeTeam: match.home_team.home_team_name,
    awayTeam: match.away_team.away_team_name,
    homeScore: match.home_score,
    awayScore: match.away_score,
    homeScoreRegular: match.home_score_regular,
    awayScoreRegular: match.away_score_regular,
    homeScorePenalties: match.home_score_penalties,
    awayScorePenalties: match.away_score_penalties,
    stageName,
    stageKey: resolvePhaseKey(stageName),
    stageOrder: STAGE_ORDER[stageName] ?? 99,
    stadium: match.stadium.name,
    stadiumCountry: match.stadium.country.name,
    status,
    statusLabel,
    matchWeek: match.match_week,
  };
}

export interface ApiSportsFixtureItem {
  fixture: {
    id: number;
    date: string;
    status: { short: string; long: string; elapsed: number | null };
    venue?: { name?: string | null; city?: string | null };
  };
  league: { round?: string | null };
  teams: {
    home: { name: string };
    away: { name: string };
  };
  goals: { home: number | null; away: number | null };
}

function mapApiStatus(short: string, dateIso: string): { status: MatchStatus; statusLabel: string } {
  const liveCodes = new Set(["1H", "2H", "HT", "ET", "BT", "P", "LIVE", "INT"]);
  const finishedCodes = new Set(["FT", "AET", "PEN", "AWD", "WO"]);
  const postponedCodes = new Set(["PST", "CANC", "ABD", "SUSP"]);

  if (liveCodes.has(short)) {
    return { status: "live", statusLabel: "Live" };
  }
  if (finishedCodes.has(short)) {
    return { status: "finished", statusLabel: "Finished" };
  }
  if (postponedCodes.has(short)) {
    return { status: "postponed", statusLabel: "Postponed" };
  }

  return { status: "scheduled", statusLabel: "Scheduled" };
}

export function fromApiSportsFixture(item: ApiSportsFixtureItem): TournamentMatch {
  const stageName = normalizeApiSportsRound(item.league.round);
  const { status, statusLabel } = mapApiStatus(item.fixture.status.short, item.fixture.date);
  const date = item.fixture.date.slice(0, 10);

  return {
    id: `api-${item.fixture.id}`,
    source: "api-sports",
    date,
    kickOff: item.fixture.date,
    homeTeam: item.teams.home.name,
    awayTeam: item.teams.away.name,
    homeScore: item.goals.home,
    awayScore: item.goals.away,
    stageName,
    stageKey: resolvePhaseKey(stageName),
    stageOrder: STAGE_ORDER[stageName] ?? 99,
    stadium: item.fixture.venue?.name ?? "TBD",
    stadiumCountry: item.fixture.venue?.city ?? undefined,
    status,
    statusLabel,
  };
}

/** Map a persisted / live ESPN scoreboard row into TournamentMatch. */
export function fromEspnScoreboardEvent(
  event: {
    externalKey: string;
    homeTeamName: string;
    awayTeamName: string;
    homeScore: number;
    awayScore: number;
    matchDate: Date | string;
    round?: string | null;
    status: string;
  },
  source: TournamentMatch["source"] = "scraped"
): TournamentMatch {
  const matchDate = event.matchDate instanceof Date ? event.matchDate : new Date(event.matchDate);
  const stageName = normalizeApiSportsRound(event.round) || event.round || "Matchday";
  const status = (["finished", "live", "scheduled", "postponed"].includes(event.status)
    ? event.status
    : "scheduled") as MatchStatus;
  const statusLabel =
    status === "live"
      ? "Live"
      : status === "finished"
        ? "Final"
        : status === "postponed"
          ? "Postponed"
          : "Scheduled";

  return {
    id: event.externalKey,
    source,
    date: matchDate.toISOString().slice(0, 10),
    kickOff: matchDate.toISOString(),
    homeTeam: event.homeTeamName,
    awayTeam: event.awayTeamName,
    homeScore: status === "scheduled" && event.homeScore === 0 && event.awayScore === 0
      ? null
      : event.homeScore,
    awayScore: status === "scheduled" && event.homeScore === 0 && event.awayScore === 0
      ? null
      : event.awayScore,
    stageName,
    stageKey: resolvePhaseKey(stageName),
    stageOrder: STAGE_ORDER[stageName] ?? 50,
    stadium: "—",
    status,
    statusLabel,
  };
}

export function groupTournamentMatches(matches: TournamentMatch[]) {
  const buckets = new Map<string, TournamentMatch[]>();

  for (const match of matches) {
    const list = buckets.get(match.stageName) ?? [];
    list.push(match);
    buckets.set(match.stageName, list);
  }

  return Array.from(buckets.entries())
    .map(([stageName, stageMatches]) => ({
      stageName,
      stageKey: stageMatches[0]?.stageKey ?? resolvePhaseKey(stageName),
      stageOrder: stageMatches[0]?.stageOrder ?? 99,
      matches: stageMatches.sort((a, b) => {
        const dateCmp = a.date.localeCompare(b.date);
        if (dateCmp !== 0) return dateCmp;
        return (a.kickOff ?? "").localeCompare(b.kickOff ?? "");
      }),
    }))
    .sort((a, b) => a.stageOrder - b.stageOrder);
}

export function filterTournamentRounds(
  rounds: ReturnType<typeof groupTournamentMatches>,
  phase: PhaseFilterKey,
  search: string
) {
  const term = search.trim().toLowerCase();

  return rounds
    .map((round) => ({
      ...round,
      matches: round.matches.filter((match) => {
        const phaseOk = phase === "all" || match.stageKey === phase;
        const searchOk =
          !term ||
          match.homeTeam.toLowerCase().includes(term) ||
          match.awayTeam.toLowerCase().includes(term);
        return phaseOk && searchOk;
      }),
    }))
    .filter((round) => round.matches.length > 0);
}
