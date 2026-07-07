import type {
  DashboardOverview,
  PaginatedResult,
  Player,
  PlayerFilters,
  PlayerLite,
  Team,
  TeamStatistic,
  Competition,
} from "@/types";

export interface PlayerRepository {
  findMany(filters: PlayerFilters): Promise<PaginatedResult<Player>>;
  findById(id: string): Promise<Player | null>;
  findLite(): Promise<PlayerLite[]>;
  findForComparison(idA: string, idB: string): Promise<[Player, Player] | null>;
  getAll(): Promise<Player[]>;
}

export interface TeamRepository {
  findAll(competitionId?: string): Promise<
    (Team & {
      competition?: Competition;
      stats?: TeamStatistic;
      squadSize: number;
    })[]
  >;
  findById(id: string): Promise<
    | (Team & {
        competition?: Competition;
        stats?: TeamStatistic;
        squad: Player[];
      })
    | null
  >;
  getCompetitions(): Promise<Competition[]>;
}

export interface DashboardRepository {
  getOverview(): Promise<DashboardOverview>;
}
