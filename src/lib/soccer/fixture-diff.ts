export type StoredFixtureRow = {
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
  matchDate: Date;
  round: string | null;
  status: string | null;
  seasonLabel: string | null;
  competitionId: string | null;
};

export type IncomingFixtureRow = {
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
  matchDate: Date;
  round?: string | null;
  status: string;
  seasonLabel: string;
  competitionId: string | null;
};

/** True when upserting would not change any persisted column. */
export function isFixtureUnchanged(
  stored: StoredFixtureRow | null | undefined,
  incoming: IncomingFixtureRow
): boolean {
  if (!stored) return false;
  return (
    stored.homeTeamId === incoming.homeTeamId &&
    stored.awayTeamId === incoming.awayTeamId &&
    stored.homeScore === incoming.homeScore &&
    stored.awayScore === incoming.awayScore &&
    stored.matchDate.getTime() === incoming.matchDate.getTime() &&
    (stored.round ?? null) === (incoming.round ?? null) &&
    (stored.status ?? null) === incoming.status &&
    (stored.seasonLabel ?? null) === incoming.seasonLabel &&
    (incoming.competitionId == null || stored.competitionId === incoming.competitionId)
  );
}
