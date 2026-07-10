import type { Player, PlayerStatistic } from "@/types";

const PREFERRED_BASKETBALL_SEASONS = ["202526", "202627"];

export function pickBasketballDisplayStats(player: Player): PlayerStatistic {
  const current = player.currentSeasonStats;
  const currentPoints = statPoints(current);
  if (currentPoints > 0) return current;

  for (const season of PREFERRED_BASKETBALL_SEASONS) {
    const row = player.history.find((entry) => entry.season === season);
    if (row && statPoints(row) > 0) return row;
  }

  const withData = [...player.history]
    .reverse()
    .find((entry) => statPoints(entry) > 0 || statRebounds(entry) > 0 || statAssists(entry) > 0);

  return withData ?? current;
}

export function statPoints(stat: PlayerStatistic): number {
  return stat.points ?? stat.perGame?.points ?? 0;
}

export function statRebounds(stat: PlayerStatistic): number {
  return stat.rebounds ?? stat.perGame?.rebounds ?? 0;
}

export function statAssists(stat: PlayerStatistic): number {
  return stat.perGame?.assists ?? stat.assists ?? 0;
}

export function sortBasketballLeaders(
  players: Player[],
  metric: "points" | "rebounds" | "assists",
  limit = 5
): Player[] {
  const getter =
    metric === "points"
      ? (player: Player) => statPoints(pickBasketballDisplayStats(player))
      : metric === "rebounds"
        ? (player: Player) => statRebounds(pickBasketballDisplayStats(player))
        : (player: Player) => statAssists(pickBasketballDisplayStats(player));

  return [...players]
    .filter((player) => getter(player) > 0)
    .sort((a, b) => getter(b) - getter(a))
    .slice(0, limit);
}
