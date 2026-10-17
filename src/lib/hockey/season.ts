/** NHL API season id is eight digits (`20262027`). Profiles store the compact six-digit key. */
export function nhlApiSeasonId(now = new Date()): string {
  const start = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  return `${start}${start + 1}`;
}

export function compactHockeySeason(apiSeasonId: string | number): number {
  const raw = String(apiSeasonId);
  if (/^\d{8}$/.test(raw)) return Number(raw.slice(0, 4) + raw.slice(6));
  if (/^\d{6}$/.test(raw)) return Number(raw);
  return 202627;
}

export function hockeyRating(input: {
  position: string;
  gamesPlayed: number;
  points: number;
  savePercentage: number;
}): number {
  if (input.gamesPlayed <= 0) return 0;
  if (input.position === "G") {
    if (input.savePercentage <= 0) return 0;
    return Number(Math.min(9.4, Math.max(5, 6 + (input.savePercentage - 0.9) * 40)).toFixed(2));
  }
  const perGame = input.points / input.gamesPlayed;
  return Number(Math.min(9.4, 5.6 + perGame * 1.2).toFixed(2));
}
