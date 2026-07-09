// ==========================================================
// Domain types — decoupled from Prisma so UI and repositories
// share a stable contract regardless of DATA_SOURCE.
// ==========================================================

export type Foot = "LEFT" | "RIGHT" | "BOTH";

export interface Competition {
  id: string;
  name: string;
  country: string;
  tier: number;
  logoUrl?: string;
}

export interface Team {
  id: string;
  name: string;
  shortName: string;
  country: string;
  crestUrl?: string;
  apiSportsId?: number;
  foundedYear: number;
  stadium: string;
  competitionId: string;
}

export interface PlayerMetricPer90 {
  goals: number;
  assists: number;
  shots: number;
  keyPasses: number;
  dribbles: number;
  tackles: number;
  interceptions: number;
}

export interface PlayerStatistic {
  id: string;
  playerId: string;
  teamId: string;
  teamName?: string;
  teamShortName?: string;
  season: string;
  appearances: number;
  minutesPlayed: number;
  goals: number;
  assists: number;
  xG: number;
  xA: number;
  shots: number;
  shotsOnTarget: number;
  passes: number;
  passAccuracy: number;
  keyPasses: number;
  dribblesCompleted: number;
  tacklesWon: number;
  interceptions: number;
  duelsWonPct: number;
  yellowCards: number;
  redCards: number;
  rating: number;
  per90: PlayerMetricPer90;
}

export interface Player {
  id: string;
  fullName: string;
  knownAs: string;
  dateOfBirth: string;
  age: number;
  nationality: string;
  position: string;
  secondaryPosition?: string;
  height: number;
  weight: number;
  preferredFoot: Foot;
  marketValue: number;
  photoUrl?: string;
  apiSportsId?: number;
  teamId: string;
  teamName?: string;
  teamShortName?: string;
  competitionName?: string;
  strengths: string[];
  weaknesses: string[];
  currentSeasonStats: PlayerStatistic;
  /** Temporadas disponíveis em PlayerSeasonStats / histórico legado. */
  availableSeasons: string[];
  /** Temporada exibida na UI (padrão: ano mais recente). */
  selectedSeason: string;
  history: PlayerStatistic[];
}

export interface TeamStatistic {
  id: string;
  teamId: string;
  season: string;
  matchesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  xG: number;
  xGA: number;
  possessionPct: number;
  passAccuracyPct: number;
  pressuresPer90: number;
  attackRating: number;
  defenseRating: number;
}

export interface ReportPlayingStyle {
  label: string;
  description: string;
  traits: string[];
}

export interface TacticalFit {
  systems: string[];
  roles: string[];
  narrative: string;
}

export interface ScoutingReport {
  id: string;
  playerId: string;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  playingStyle: ReportPlayingStyle;
  tacticalFit: TacticalFit;
  recommendation: string;
  overallRating: number;
  generatedBy: string;
  createdAt: string;
}

export interface PlayerFilters {
  search?: string;
  position?: string;
  league?: string;
  teamId?: string;
  minAge?: number;
  maxAge?: number;
  minRating?: number;
  minMinutes?: number;
  minGoalsPer90?: number;
  minXGPer90?: number;
  maxMarketValue?: number;
  sortBy?:
    | "rating"
    | "goals"
    | "assists"
    | "assistsPer90"
    | "goalsPer90"
    | "xGPer90"
    | "age"
    | "marketValue"
    | "name"
    | "position"
    | "club";
  sortDir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface DashboardInsight {
  id: string;
  type: "alert" | "opportunity" | "trend";
  title: string;
  description: string;
  href?: string;
}

export interface DashboardOverview {
  totalPlayers: number;
  totalTeams: number;
  totalCompetitions: number;
  avgAge: number;
  totalGoals: number;
  totalAssists: number;
  avgRating: number;
  topProspectsCount: number;
  topProspects: Player[];
  bestPerformersCount: number;
  bestPerformers: Player[];
  marketOpportunitiesCount: number;
  marketOpportunities: Player[];
  topScorers: Player[];
  topRated: Player[];
  goalsByPosition: { position: string; goals: number }[];
  ratingTrend: { season: string; avgRating: number }[];
  ratingChange: number;
  insights: DashboardInsight[];
}

export type PlayerLite = Pick<
  Player,
  "id" | "fullName" | "knownAs" | "position" | "teamId" | "teamShortName" | "teamName"
>;
