import { cache } from "react";
import { queryTeamById } from "@/features/scouting/queries/teams";
import { buildSoccerIntelligenceProfile } from "@/lib/intelligence/soccer/build-soccer-intelligence-profile";
import { computeTacticalFit } from "@/lib/intelligence/soccer/compute-tactical-fit";
import { buildTeamStyleProfile } from "@/lib/intelligence/soccer/team-style-profile";
import type { TacticalFitResult } from "@/lib/intelligence/soccer/compute-tactical-fit";
import { getPlayerRepository } from "@/features/scouting/repository";
import { ensureRuntimeDataSource } from "@/lib/ensure-runtime-data-source";

export const queryTacticalFit = cache(
  async (playerId: string, teamId?: string): Promise<TacticalFitResult | null> => {
    await ensureRuntimeDataSource();
    const repo = getPlayerRepository();
    const player = await repo.findById(playerId);
    if (!player || (player.sport ?? "SOCCER") !== "SOCCER") return null;

    const targetTeamId = teamId ?? player.teamId;
    const team = await queryTeamById(targetTeamId);
    const stats = team?.stats;
    if (!team || !stats) return null;

    const profile = buildSoccerIntelligenceProfile(player);
    return computeTacticalFit(profile, buildTeamStyleProfile(stats), team.name);
  }
);
