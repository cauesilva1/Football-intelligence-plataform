import { cache } from "react";
import { similarPositionGroup } from "@/features/scouting/lib/position-scorecard";
import { loadLeaguePercentileTable } from "@/features/scouting/queries/league-percentiles";
import { getPlayerRepository } from "@/features/scouting/repository";
import { buildSoccerIntelligenceProfile } from "@/lib/intelligence/soccer/build-soccer-intelligence-profile";
import {
  RECRUITMENT_DISCLAIMER,
  type RecruitmentBrief,
  type RecruitmentCandidatesResult,
} from "@/lib/intelligence/soccer/recruitment-types";
import { rankRecruitmentCandidates } from "@/lib/intelligence/soccer/score-recruitment-fit";
import { ensureRuntimeDataSource } from "@/lib/ensure-runtime-data-source";
import { CURRENT_SEASON } from "@/lib/data/generators";
import { SOCCER_RATE_MIN_MINUTES } from "@/lib/scoring";
import type { PlayerFilters } from "@/types";

const CANDIDATE_POOL_PAGE_SIZE = 50;
const CANDIDATE_POOL_MAX_PAGES = 16;

function briefToPlayerFilters(brief: RecruitmentBrief): PlayerFilters {
  return {
    sport: "SOCCER",
    position: similarPositionGroup(brief.position).join(","),
    league: brief.league,
    minAge: brief.minAge,
    maxAge: brief.maxAge,
    maxMarketValue: brief.maxMarketValue,
    minMinutes: brief.minMinutes ?? SOCCER_RATE_MIN_MINUTES,
    minRating: brief.minRating,
    sortBy: "rating",
    sortDir: "desc",
    page: 1,
    pageSize: CANDIDATE_POOL_PAGE_SIZE,
  };
}

async function loadCandidatePool(brief: RecruitmentBrief) {
  const repo = getPlayerRepository();
  const filters = briefToPlayerFilters(brief);
  const players = [];

  for (let page = 1; page <= CANDIDATE_POOL_MAX_PAGES; page += 1) {
    const result = await repo.findMany({ ...filters, page });
    players.push(...result.items);
    if (page >= result.totalPages) break;
  }

  return players;
}

export const queryRecruitmentCandidates = cache(
  async (brief: RecruitmentBrief): Promise<RecruitmentCandidatesResult> => {
    await ensureRuntimeDataSource();

    if (brief.sport !== "SOCCER") {
      throw new Error(`Recruitment engine is soccer-only (got ${brief.sport}).`);
    }

    const season = brief.season ?? CURRENT_SEASON;
    const [players, percentileTable] = await Promise.all([
      loadCandidatePool(brief),
      brief.league ? loadLeaguePercentileTable(brief.league, brief.position, season) : null,
    ]);

    const profilesByPlayerId = new Map(
      players.map((player) => [
        player.id,
        buildSoccerIntelligenceProfile(player, { percentileTable }),
      ])
    );

    const candidates = rankRecruitmentCandidates(brief, players, profilesByPlayerId);

    return {
      disclaimer: RECRUITMENT_DISCLAIMER,
      brief,
      totalEvaluated: players.length,
      candidates,
    };
  }
);
