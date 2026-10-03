/** Persisted basketball seasons are compact ("202627"); show them as "2026/27". */
export function formatSeasonLabel(season: string): string {
  const compact = /^(\d{4})(\d{2})$/.exec(season.trim());
  if (!compact) return season;
  const start = Number(compact[1]);
  const end = Number(compact[2]);
  if ((start + 1) % 100 !== end) return season;
  return `${compact[1]}/${compact[2]}`;
}
