"use server";

import { revalidatePath } from "next/cache";
import { getPrisma } from "@/lib/prisma";
import { canUseDatabase } from "@/lib/system-cache";
import { enforceActionRateLimit } from "@/lib/action-guard";
import { resolveAmericanFootballLeagueCode } from "@/lib/american-football/team-league";
import { resolveFootballHubSeasonYears } from "@/lib/api/espn-football-seasons";
import { ensureAmericanFootballPlayerSeasons } from "@/lib/sync/american-football-roster";

export async function enrichAmericanFootballPlayerSeasonsAction(
  playerId: string
): Promise<{ ok: boolean; refreshed: boolean; error?: string }> {
  if (!canUseDatabase() || !playerId) {
    return { ok: false, refreshed: false };
  }

  try {
    // ESPN + DB writes — keep abuse bounded (12 / hour / IP).
    await enforceActionRateLimit("af-enrich", { limit: 12, windowMs: 60 * 60_000 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "RATE_LIMITED";
    return { ok: false, refreshed: false, error: message };
  }

  const prisma = getPrisma();
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: {
      id: true,
      sport: true,
      league: true,
      apiSportsId: true,
      team: { select: { competition: { select: { name: true } } } },
      stats: { select: { season: true, points: true, goals: true, tackles: true, steals: true } },
    },
  });

  if (!player || player.sport !== "AMERICAN_FOOTBALL") {
    return { ok: false, refreshed: false };
  }

  const league = resolveAmericanFootballLeagueCode(
    player.league,
    player.team?.competition?.name
  );
  if (!league) return { ok: false, refreshed: false };

  const { pastYear, currentYear } = resolveFootballHubSeasonYears();
  const pastRow = player.stats.find((s) => s.season === pastYear);
  const hasCurrentStub = player.stats.some((s) => s.season === currentYear);
  const pastHasSignal =
    !!pastRow &&
    (pastRow.points > 0 || pastRow.goals > 0 || pastRow.tackles > 0 || pastRow.steals > 0);

  if (hasCurrentStub && pastRow && pastHasSignal) {
    return { ok: true, refreshed: false };
  }

  const fetched = await ensureAmericanFootballPlayerSeasons({
    playerId: player.id,
    espnAthleteId: player.apiSportsId,
    league,
    fetchPastStats: !pastHasSignal,
    timeoutMs: 10_000,
  });

  if (fetched || !pastRow || !hasCurrentStub) {
    revalidatePath(`/players/${playerId}`);
  }

  return { ok: true, refreshed: fetched || !pastHasSignal };
}
