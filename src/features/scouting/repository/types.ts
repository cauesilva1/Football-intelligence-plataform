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
import type { Sport } from "@/lib/sport";

export interface PlayerRepository {
  findMany(filters: PlayerFilters): Promise<PaginatedResult<Player>>;
  findById(id: string, options?: { season?: string }): Promise<Player | null>;
  findLite(
    sport?: Sport,
    options?: { take?: number; ensureIds?: string[]; search?: string }
  ): Promise<PlayerLite[]>;
  findForComparison(idA: string, idB: string): Promise<[Player, Player] | null>;
  /** Bounded sample for dashboards / similarity — never full-table hydrate. */
  findSample(
    sport?: Sport,
    options?: { position?: string; take?: number }
  ): Promise<Player[]>;
  getAll(sport?: Sport): Promise<Player[]>;
}

export type TeamDirectoryRow = Team & {
  competition?: Competition;
  stats?: TeamStatistic;
  squadSize: number;
};

export interface TeamRepository {
  findAll(competitionId?: string): Promise<TeamDirectoryRow[]>;
  /** Sport/league-scoped directory page — avoids hydrating every franchise. */
  findDirectory(options: {
    competitionIds: string[];
    take?: number;
    skip?: number;
    includeStats?: boolean;
  }): Promise<{ items: TeamDirectoryRow[]; total: number }>;
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
  getOverview(sport?: Sport): Promise<DashboardOverview>;
}
