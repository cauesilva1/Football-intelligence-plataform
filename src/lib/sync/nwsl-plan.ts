/**
 * Incremental NWSL roster backfill from ESPN (free).
 * Teams + squads only. Never fixtures. Own time budget, outside the daily soccer cron.
 */

export const NWSL_EXPECTED_CLUBS = 16;
/** A club at or above this roster size is treated as already backfilled. */
export const NWSL_MIN_SQUAD = 16;
/** Weekly route budget. Daily soccer cron stays at 300s and does not call this. */
export const NWSL_SYNC_BUDGET_MS = 45_000;
export const NWSL_CRON_MAX_DURATION_SEC = 60;

export type NwslTeamProgress = {
  espnTeamId: string;
  playerCount: number;
};

export type NwslBackfillStep =
  | { kind: "stop"; reason: "time-budget" | "complete" }
  | { kind: "fetch-teams" }
  | { kind: "fetch-roster"; espnTeamId: string };

/**
 * Next ESPN call. The club directory comes first. Rosters resume from the first
 * club that is not already complete. There is no API-Football quota here.
 */
export function nextNwslBackfillStep(input: {
  teamsKnown: boolean;
  teams: readonly NwslTeamProgress[];
  completedTeamIds: readonly string[];
  pastDeadline: boolean;
}): NwslBackfillStep {
  if (input.pastDeadline) return { kind: "stop", reason: "time-budget" };
  if (!input.teamsKnown) return { kind: "fetch-teams" };

  const done = new Set(input.completedTeamIds);
  const next = input.teams.find(
    (team) => !done.has(team.espnTeamId) && team.playerCount < NWSL_MIN_SQUAD
  );
  if (!next) return { kind: "stop", reason: "complete" };
  return { kind: "fetch-roster", espnTeamId: next.espnTeamId };
}
