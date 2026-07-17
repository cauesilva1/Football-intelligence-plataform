import { getPrisma } from "@/lib/prisma";
import { canUseDatabase } from "@/lib/system-cache";
import { namesLikelyMatch } from "@/lib/sync/data-staleness";
import type { NbaStandingGroup, NbaStandingRow } from "@/lib/api/espn-nba-standings";

/**
 * Attach DB team ids to ESPN standings rows.
 * Prefer espnTeamId → apiSportsId, then abbreviation/shortName, then fuzzy name.
 */
export async function attachTeamIdsToStandings(
  groups: NbaStandingGroup[],
  competitionId?: string
): Promise<NbaStandingGroup[]> {
  if (!canUseDatabase() || groups.length === 0) return groups;

  const teamNames = [...new Set(groups.flatMap((g) => g.rows.map((r) => r.teamName)))];

  const teams = await getPrisma().team.findMany({
    where: competitionId
      ? { competitionId }
      : {
          name: {
            in: teamNames,
            mode: "insensitive",
          },
        },
    select: { id: true, name: true, shortName: true, apiSportsId: true },
  });

  if (!teams.length) return groups;

  const byApiId = new Map(
    teams
      .filter((t) => t.apiSportsId != null)
      .map((t) => [t.apiSportsId!, t.id] as const)
  );
  const byLower = new Map(teams.map((t) => [t.name.toLowerCase(), t.id] as const));
  const byAbbr = new Map(
    teams
      .filter((t) => t.shortName?.trim())
      .map((t) => [t.shortName.trim().toLowerCase(), t.id] as const)
  );

  const resolveId = (row: NbaStandingRow): string | undefined => {
    if (row.teamId) return row.teamId;

    if (row.espnTeamId != null && byApiId.has(row.espnTeamId)) {
      return byApiId.get(row.espnTeamId);
    }

    const abbr = row.abbreviation?.trim().toLowerCase();
    if (abbr && byAbbr.has(abbr)) return byAbbr.get(abbr);

    const exact = byLower.get(row.teamName.toLowerCase());
    if (exact) return exact;

    return teams.find(
      (t) =>
        namesLikelyMatch(t.name, row.teamName) ||
        namesLikelyMatch(t.shortName, row.teamName) ||
        (abbr ? namesLikelyMatch(t.shortName, abbr) : false)
    )?.id;
  };

  return groups.map((group) => ({
    ...group,
    rows: group.rows.map(
      (row): NbaStandingRow => ({
        ...row,
        teamId: resolveId(row),
      })
    ),
  }));
}
