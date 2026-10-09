export interface SeasonTeamAppearance {
  teamName: string | null;
  games: number;
  minutes: number;
}

/** Team with the most games in the season. Minutes break a tie. */
export function pickSeasonTeam(appearances: SeasonTeamAppearance[]): string | null {
  const ranked = appearances
    .map((row) => ({
      teamName: row.teamName?.trim() ?? "",
      games: row.games,
      minutes: row.minutes,
    }))
    .filter((row) => row.teamName && row.teamName.toUpperCase() !== "NAN");
  if (!ranked.length) return null;
  ranked.sort(
    (a, b) => b.games - a.games || b.minutes - a.minutes || a.teamName.localeCompare(b.teamName)
  );
  return ranked[0].teamName;
}

export function campaignSeasonNumber(label: string | undefined): number | null {
  if (!label?.trim()) return null;
  const compact = label.trim().replace("/", "");
  if (!/^\d{6}$/.test(compact)) return null;
  const season = Number(compact);
  return Number.isInteger(season) ? season : null;
}
