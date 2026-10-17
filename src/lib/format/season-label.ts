/** Persisted basketball seasons are compact ("202627"); show them as "2026/27". Hockey uses "2026-27 regular season". */
export function formatSeasonLabel(season: string, sport?: string): string {
  const compact = /^(\d{4})(\d{2})$/.exec(season.trim());
  if (!compact) return season;
  const start = Number(compact[1]);
  const end = Number(compact[2]);
  if ((start + 1) % 100 !== end) return season;
  if (sport === "HOCKEY") return `${compact[1]}-${compact[2]} regular season`;
  return `${compact[1]}/${compact[2]}`;
}
