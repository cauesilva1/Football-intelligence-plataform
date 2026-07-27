import { cache } from "react";
import { queryPlayerIntelligenceProfile } from "@/features/scouting/queries/player-intelligence";
import { getPlayerRepository } from "@/features/scouting/repository";
import {
  mergeRecruitmentBrief,
  seedRecruitmentBriefFromPlayer,
} from "@/lib/intelligence/seed-recruitment-brief";
import type { RecruitmentBrief } from "@/lib/intelligence/recruitment-types";
import { ensureRuntimeDataSource } from "@/lib/ensure-runtime-data-source";
import type { Player } from "@/types";

export interface ReplaceRecruitmentSeed {
  target: Player;
  brief: RecruitmentBrief;
  formDefaults: {
    position: string;
    maxAge?: string;
    maxValue?: string;
    maxCapHit?: string;
    minRating?: string;
    league?: string;
    limit: string;
    replacePlayerId: string;
  };
}

function numParam(
  searchParams: Record<string, string | string[] | undefined>,
  key: string
): number | undefined {
  const raw = searchParams[key];
  const value = typeof raw === "string" ? Number(raw) : NaN;
  return Number.isFinite(value) ? value : undefined;
}

export function parseRecruitmentBriefFromParams(
  searchParams: Record<string, string | string[] | undefined>
): RecruitmentBrief | null {
  const position =
    typeof searchParams.position === "string" ? searchParams.position : undefined;
  if (!position) return null;

  const sportRaw = typeof searchParams.sport === "string" ? searchParams.sport : "SOCCER";
  const sport =
    sportRaw === "BASKETBALL"
      ? "BASKETBALL"
      : sportRaw === "AMERICAN_FOOTBALL"
        ? "AMERICAN_FOOTBALL"
        : "SOCCER";

  const replacePlayerId =
    typeof searchParams.replacePlayerId === "string"
      ? searchParams.replacePlayerId
      : undefined;

  return {
    sport,
    position,
    league: typeof searchParams.league === "string" ? searchParams.league : undefined,
    maxAge: numParam(searchParams, "maxAge"),
    maxMarketValue: numParam(searchParams, "maxValue"),
    maxCapHit: numParam(searchParams, "maxCapHit"),
    minRating: numParam(searchParams, "minRating"),
    limit: numParam(searchParams, "limit") ?? 15,
    trajectory: "any",
    excludePlayerIds: replacePlayerId ? [replacePlayerId] : undefined,
    seedFromPlayerId: replacePlayerId,
  };
}

export const loadReplaceRecruitmentSeed = cache(
  async (playerId: string): Promise<ReplaceRecruitmentSeed | null> => {
    await ensureRuntimeDataSource();
    const repo = getPlayerRepository();
    const player = await repo.findById(playerId);
    if (!player) return null;

    const profile = await queryPlayerIntelligenceProfile(playerId);
    if (!profile) return null;

    const brief = seedRecruitmentBriefFromPlayer(player, profile);
    return {
      target: player,
      brief,
      formDefaults: {
        position: brief.position,
        maxAge: brief.maxAge != null ? String(brief.maxAge) : undefined,
        maxValue: brief.maxMarketValue != null ? String(brief.maxMarketValue) : undefined,
        maxCapHit: brief.maxCapHit != null ? String(brief.maxCapHit) : undefined,
        minRating: brief.minRating != null ? String(brief.minRating) : undefined,
        league: brief.league,
        limit: String(brief.limit ?? 15),
        replacePlayerId: player.id,
      },
    };
  }
);

export async function resolveRecruitmentBrief(
  searchParams: Record<string, string | string[] | undefined>
): Promise<{ brief: RecruitmentBrief; replaceTarget?: Player } | null> {
  const replacePlayerId =
    typeof searchParams.replacePlayerId === "string"
      ? searchParams.replacePlayerId
      : undefined;

  const parsed = parseRecruitmentBriefFromParams(searchParams);

  if (replacePlayerId) {
    const seed = await loadReplaceRecruitmentSeed(replacePlayerId);
    if (!seed) return parsed ? { brief: parsed } : null;

    if (!parsed) {
      return { brief: seed.brief, replaceTarget: seed.target };
    }

    return {
      brief: mergeRecruitmentBrief(seed.brief, {
        ...parsed,
        excludePlayerIds: [replacePlayerId],
        seedFromPlayerId: replacePlayerId,
        preferredRoles: seed.brief.preferredRoles,
        priorities: parsed.priorities ?? seed.brief.priorities,
      }),
      replaceTarget: seed.target,
    };
  }

  return parsed ? { brief: parsed } : null;
}
