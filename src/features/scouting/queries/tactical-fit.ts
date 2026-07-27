import { cache } from "react";
import { queryTeamById } from "@/features/scouting/queries/teams";
import { getPlayerRepository } from "@/features/scouting/repository";
import { buildAmericanFootballIntelligenceProfile } from "@/lib/intelligence/american-football/build-american-football-intelligence-profile";
import { computeAmericanFootballTacticalFit } from "@/lib/intelligence/american-football/compute-tactical-fit";
import { buildAmericanFootballTeamStyleProfile } from "@/lib/intelligence/american-football/team-style-profile";
import { buildBasketballIntelligenceProfile } from "@/lib/intelligence/basketball/build-basketball-intelligence-profile";
import { computeBasketballTacticalFit } from "@/lib/intelligence/basketball/compute-tactical-fit";
import { buildBasketballTeamStyleProfile } from "@/lib/intelligence/basketball/team-style-profile";
import { buildSoccerIntelligenceProfile } from "@/lib/intelligence/soccer/build-soccer-intelligence-profile";
import { computeTacticalFit } from "@/lib/intelligence/soccer/compute-tactical-fit";
import { buildTeamStyleProfile } from "@/lib/intelligence/soccer/team-style-profile";
import type { TacticalFitResult } from "@/lib/intelligence/tactical-fit-types";
import { ensureRuntimeDataSource } from "@/lib/ensure-runtime-data-source";
import type { Sport } from "@/lib/sport";

export const queryTacticalFit = cache(
  async (playerId: string, teamId?: string): Promise<TacticalFitResult | null> => {
    await ensureRuntimeDataSource();
    const repo = getPlayerRepository();
    const player = await repo.findById(playerId);
    if (!player) return null;

    const sport = (player.sport ?? "SOCCER") as Sport;
    const targetTeamId = teamId ?? player.teamId;
    const team = await queryTeamById(targetTeamId);
    const stats = team?.stats;
    if (!team || !stats) return null;

    // Prefer live standings overlay when present (BB/AF often land here).
    const effectiveStats = team.statsBomb
      ? {
          ...stats,
          teamId: team.id,
          matchesPlayed: team.statsBomb.matchesPlayed || stats.matchesPlayed,
          wins: team.statsBomb.wins,
          draws: team.statsBomb.draws,
          losses: team.statsBomb.losses,
          goalsFor: team.statsBomb.goalsFor,
          goalsAgainst: team.statsBomb.goalsAgainst,
        }
      : { ...stats, teamId: stats.teamId || team.id };

    if (sport === "BASKETBALL") {
      const profile = buildBasketballIntelligenceProfile(player);
      return computeBasketballTacticalFit(
        profile,
        buildBasketballTeamStyleProfile(effectiveStats),
        team.name
      );
    }

    if (sport === "AMERICAN_FOOTBALL") {
      const profile = buildAmericanFootballIntelligenceProfile(player);
      return computeAmericanFootballTacticalFit(
        profile,
        buildAmericanFootballTeamStyleProfile(effectiveStats),
        team.name
      );
    }

    if (sport !== "SOCCER") return null;

    const profile = buildSoccerIntelligenceProfile(player);
    return computeTacticalFit(profile, buildTeamStyleProfile(effectiveStats), team.name);
  }
);
