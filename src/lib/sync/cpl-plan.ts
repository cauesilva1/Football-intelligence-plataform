/**
 * Incremental Canadian Premier League backfill.
 * Teams + squads only. Never fixtures. Stops before the API-Football safety floor
 * and before its own time budget so the daily soccer cron is untouched.
 */

export const CPL_EXPECTED_CLUBS = 8;
/** A club at or above this roster size is treated as already backfilled. */
export const CPL_MIN_SQUAD = 16;
/** Weekly route budget. Daily soccer cron stays at 300s and does not call this. */
export const CPL_SYNC_BUDGET_MS = 45_000;
export const CPL_CRON_MAX_DURATION_SEC = 60;

export type CplTeamProgress = {
  apiSportsId: number;
  playerCount: number;
};

export type CplBackfillStep =
  | { kind: "stop"; reason: "low-quota" | "time-budget" | "complete" }
  | { kind: "fetch-teams" }
  | { kind: "fetch-squad"; apiSportsId: number };

export function mapApiFootballSquadPosition(position: string | null | undefined): string {
  const normalized = position?.toLowerCase() ?? "";
  if (normalized.includes("goal")) return "GK";
  if (normalized.includes("defend")) return "CB";
  if (normalized.includes("mid")) return "CM";
  if (normalized.includes("attack") || normalized.includes("forward")) return "ST";
  return "CM";
}

/**
 * Next paid step. Quota is checked before any call, including the first teams
 * request. Squads resume from the first club that is not already complete.
 */
export function nextCplBackfillStep(input: {
  teamsKnown: boolean;
  teams: readonly CplTeamProgress[];
  completedTeamIds: readonly number[];
  canSpend: boolean;
  pastDeadline: boolean;
}): CplBackfillStep {
  if (!input.canSpend) return { kind: "stop", reason: "low-quota" };
  if (input.pastDeadline) return { kind: "stop", reason: "time-budget" };
  if (!input.teamsKnown) return { kind: "fetch-teams" };

  const done = new Set(input.completedTeamIds);
  const next = input.teams.find(
    (team) => !done.has(team.apiSportsId) && team.playerCount < CPL_MIN_SQUAD
  );
  if (!next) return { kind: "stop", reason: "complete" };
  return { kind: "fetch-squad", apiSportsId: next.apiSportsId };
}
