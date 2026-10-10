/** Source-agnostic records the app stores. Adapters fill these; ingestion does not. */

export interface CanonicalGame {
  leagueKey: string;
  eventId: string;
  externalEventKey: string;
  homeTeamName: string;
  awayTeamName: string;
  startsAt: string | null;
}

export interface CanonicalRosterPlayer {
  externalId: string | null;
  fullName: string;
  position: string | null;
}

export interface CanonicalShotEvent {
  externalPlayId: string;
  shooterName: string | null;
  /** Attack-normalized percent. x runs toward the goal at 100; y is the width. */
  x: number;
  y: number;
  converted: boolean;
  zone: string;
  shotType: string;
  /**
   * Provider-supplied xG. Null when the source has no shot-level xG.
   * The estimated xG on player statistics is a different field and stays untouched.
   */
  realXg: number | null;
}

export interface ShotEventPage {
  shots: CanonicalShotEvent[];
  skippedInvalidCoordinate: number;
  skippedNoPlayer: number;
}

export interface PendingShotGame {
  key: string;
  leagueKey: string;
  eventId: string;
  season: number;
}

export interface BasketballShotBackfillOptions {
  deadlineMs: number;
  maxGames?: number;
  minGameMs?: number;
  seasons?: number[];
  log?: (message: string) => void;
}

export interface BasketballShotBackfillSummary {
  season: number;
  pendingAtStart: number;
  gamesProcessed: number;
  shotsStored: number;
  skippedNoPlayer: number;
  skippedInvalidCoordinate: number;
  failed: number;
  deferred: number;
  stoppedForTime: boolean;
  coordinatesUnavailable: boolean;
}

/** One season total for one player. Ingestion matches the name; the provider does not. */
export interface CanonicalSeasonMetric {
  playerName: string;
  teamName: string | null;
  /** Season start year. MLS 2026 stays 2026. A European 2026/27 season is 2026. */
  season: number;
  leagueKey: string;
  metric: string;
  value: number;
}

export interface DataProvider {
  readonly id: string;
  listGames(leagueKey: string, on: Date): Promise<CanonicalGame[]>;
  /** Games already stored that this provider has not finished charting. */
  listPendingShotGames(leagueKey: string): Promise<PendingShotGame[]>;
  fetchShotEvents(game: PendingShotGame): Promise<ShotEventPage>;
  fetchRoster(leagueKey: string, teamName: string): Promise<CanonicalRosterPlayer[]>;
  /** Cache key for a finished shot ingest. Must stay stable across deploys. */
  shotCacheKey(externalEventKey: string): string;
  /** Basketball court queue. Soccer-only adapters omit it. */
  backfillBasketballShots?(
    options: BasketballShotBackfillOptions
  ): Promise<BasketballShotBackfillSummary[]>;
  /** Season totals such as progressive passes. Shot adapters omit it. */
  fetchSeasonMetrics?(leagueKey: string): Promise<CanonicalSeasonMetric[]>;
}
