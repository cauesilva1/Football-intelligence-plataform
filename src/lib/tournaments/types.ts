export type TournamentDataSource = "statsbomb" | "api-sports" | "scraped";

export type MatchStatus = "finished" | "live" | "scheduled" | "postponed";

export interface TournamentMatch {
  id: string;
  source: TournamentDataSource;
  date: string;
  kickOff?: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  homeScoreRegular?: number | null;
  awayScoreRegular?: number | null;
  homeScorePenalties?: number | null;
  awayScorePenalties?: number | null;
  stageName: string;
  stageKey: PhaseFilterKey;
  stageOrder: number;
  stadium: string;
  stadiumCountry?: string;
  status: MatchStatus;
  statusLabel: string;
  matchWeek?: number;
  homeCrestUrl?: string;
  awayCrestUrl?: string;
}

export type PhaseFilterKey = "all" | "group" | "r16" | "quarter" | "semi" | "final";

export interface TournamentConfig {
  id: string;
  label: string;
  description: string;
  source: TournamentDataSource;
  competitionId?: number;
  seasonId?: number;
}

export interface TournamentRound {
  stageName: string;
  stageKey: PhaseFilterKey;
  stageOrder: number;
  matches: TournamentMatch[];
}

export const PHASE_FILTER_OPTIONS: Array<{ value: PhaseFilterKey; label: string }> = [
  { value: "all", label: "Todas as Fases" },
  { value: "group", label: "Fase de Grupos" },
  { value: "r16", label: "Oitavas de Final" },
  { value: "quarter", label: "Quartas de Final" },
  { value: "semi", label: "Semifinal" },
  { value: "final", label: "Final" },
];
