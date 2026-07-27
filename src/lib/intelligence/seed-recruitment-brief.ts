import type { RecruitmentBrief } from "@/lib/intelligence/recruitment-types";
import type { IntelligenceProfile } from "@/lib/intelligence/types";
import type { Sport } from "@/lib/sport";
import type { Player } from "@/types";

function normalizePriorities(
  dimensions: IntelligenceProfile["dimensions"]
): Record<string, number> | undefined {
  if (dimensions.length === 0) return undefined;
  const raw = dimensions.map((dimension) => ({
    key: dimension.key,
    weight: Math.max(0.05, (dimension.score / 100) * Math.max(0.2, dimension.confidence)),
  }));
  const total = raw.reduce((sum, row) => sum + row.weight, 0) || 1;
  return Object.fromEntries(
    raw.map((row) => [row.key, Number((row.weight / total).toFixed(3))])
  );
}

/**
 * Build a recruitment brief from a target player + intelligence profile.
 * Prefer younger / cheaper when price data exists — never invent caps when capHit is 0.
 */
export function seedRecruitmentBriefFromPlayer(
  player: Player,
  profile: IntelligenceProfile
): RecruitmentBrief {
  const sport = (player.sport ?? profile.sport ?? "SOCCER") as Sport;
  const rating = player.currentSeasonStats.rating;
  const softMinRating = Number(Math.max(0, rating - 0.4).toFixed(1));

  const brief: RecruitmentBrief = {
    sport,
    position: player.position,
    preferredRoles: profile.role.label ? [profile.role.label] : undefined,
    priorities: normalizePriorities(profile.dimensions),
    maxAge: player.age,
    minRating: softMinRating > 0 ? softMinRating : undefined,
    excludePlayerIds: [player.id],
    seedFromPlayerId: player.id,
    limit: 15,
    trajectory: "any",
  };

  if (sport === "SOCCER" && player.marketValue > 0) {
    brief.maxMarketValue = player.marketValue;
  }

  if (
    (sport === "BASKETBALL" || sport === "AMERICAN_FOOTBALL") &&
    (player.capHit ?? 0) > 0
  ) {
    brief.maxCapHit = player.capHit;
  }

  return brief;
}

/** Merge URL/form overrides onto a seeded brief (explicit params win). */
export function mergeRecruitmentBrief(
  base: RecruitmentBrief,
  overrides: Partial<RecruitmentBrief>
): RecruitmentBrief {
  return {
    ...base,
    ...overrides,
    excludePlayerIds: overrides.excludePlayerIds ?? base.excludePlayerIds,
    seedFromPlayerId: overrides.seedFromPlayerId ?? base.seedFromPlayerId,
    preferredRoles: overrides.preferredRoles ?? base.preferredRoles,
    priorities: overrides.priorities ?? base.priorities,
  };
}
