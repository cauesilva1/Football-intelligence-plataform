import { cache } from "react";
import {
  similarBasketballPositionGroup,
  similarFootballPositionGroup,
  similarPositionGroup,
} from "@/features/scouting/lib/position-scorecard";
import {
  loadAmericanFootballLeaguePercentileTable,
  loadBasketballLeaguePercentileTable,
  loadLeaguePercentileTable,
} from "@/features/scouting/queries/league-percentiles";
import { getPlayerRepository } from "@/features/scouting/repository";
import { buildAmericanFootballIntelligenceProfile } from "@/lib/intelligence/american-football/build-american-football-intelligence-profile";
import { rankAmericanFootballRecruitmentCandidates } from "@/lib/intelligence/american-football/score-recruitment-fit";
import { buildBasketballIntelligenceProfile } from "@/lib/intelligence/basketball/build-basketball-intelligence-profile";
import { rankBasketballRecruitmentCandidates } from "@/lib/intelligence/basketball/score-recruitment-fit";
import {
  RECRUITMENT_DISCLAIMER,
  type RecruitmentBrief,
  type RecruitmentCandidatesResult,
} from "@/lib/intelligence/recruitment-types";
import { buildSoccerIntelligenceProfile } from "@/lib/intelligence/soccer/build-soccer-intelligence-profile";
import { rankRecruitmentCandidates } from "@/lib/intelligence/soccer/score-recruitment-fit";
import { ensureRuntimeDataSource } from "@/lib/ensure-runtime-data-source";
import { CURRENT_SEASON } from "@/lib/data/generators";
import {
  AF_RATE_MIN_MINUTES,
  BB_RATE_MIN_MINUTES,
  SOCCER_RATE_MIN_MINUTES,
} from "@/lib/scoring";
import type { PlayerFilters } from "@/types";

const CANDIDATE_POOL_PAGE_SIZE = 50;
const CANDIDATE_POOL_MAX_PAGES = 16;

function briefPositionFilter(brief: RecruitmentBrief): string {
  if (brief.sport === "BASKETBALL") {
    const upper = brief.position.toUpperCase();
    if (upper === "GUARD") return similarBasketballPositionGroup("PG").join(",");
    if (upper === "WING") return similarBasketballPositionGroup("SF").join(",");
    if (upper === "BIG") return similarBasketballPositionGroup("C").join(",");
    return similarBasketballPositionGroup(brief.position).join(",");
  }
  if (brief.sport === "AMERICAN_FOOTBALL") {
    const upper = brief.position.toUpperCase();
    if (upper === "QB") return similarFootballPositionGroup("QB").join(",");
    if (upper === "SKILL") return similarFootballPositionGroup("WR").join(",");
    if (upper === "DEFENSE") return similarFootballPositionGroup("LB").join(",");
    if (upper === "OL") return similarFootballPositionGroup("OL").join(",");
    if (upper === "SPECIALIST") return similarFootballPositionGroup("K").join(",");
    return similarFootballPositionGroup(brief.position).join(",");
  }
  return similarPositionGroup(brief.position).join(",");
}

function defaultMinMinutes(sport: RecruitmentBrief["sport"]): number {
  if (sport === "BASKETBALL") return BB_RATE_MIN_MINUTES;
  if (sport === "AMERICAN_FOOTBALL") return AF_RATE_MIN_MINUTES;
  return SOCCER_RATE_MIN_MINUTES;
}

function briefToPlayerFilters(brief: RecruitmentBrief): PlayerFilters {
  return {
    sport: brief.sport,
    position: briefPositionFilter(brief),
    league: brief.league,
    minAge: brief.minAge,
    maxAge: brief.maxAge,
    maxMarketValue: brief.maxMarketValue,
    minMinutes: brief.minMinutes ?? defaultMinMinutes(brief.sport),
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

    if (
      brief.sport !== "SOCCER" &&
      brief.sport !== "BASKETBALL" &&
      brief.sport !== "AMERICAN_FOOTBALL"
    ) {
      throw new Error(`Recruitment engine does not support sport: ${brief.sport}`);
    }

    const season = brief.season ?? CURRENT_SEASON;
    const players = await loadCandidatePool(brief);

    if (brief.sport === "BASKETBALL") {
      const percentileTable = brief.league
        ? await loadBasketballLeaguePercentileTable(brief.league, brief.position, season)
        : null;

      const profilesByPlayerId = new Map(
        players.map((player) => [
          player.id,
          buildBasketballIntelligenceProfile(player, { percentileTable }),
        ])
      );

      return {
        disclaimer: RECRUITMENT_DISCLAIMER,
        brief,
        totalEvaluated: players.length,
        candidates: rankBasketballRecruitmentCandidates(brief, players, profilesByPlayerId),
      };
    }

    if (brief.sport === "AMERICAN_FOOTBALL") {
      const percentileTable = brief.league
        ? await loadAmericanFootballLeaguePercentileTable(
            brief.league,
            brief.position,
            season
          )
        : null;

      const profilesByPlayerId = new Map(
        players.map((player) => [
          player.id,
          buildAmericanFootballIntelligenceProfile(player, { percentileTable }),
        ])
      );

      return {
        disclaimer: RECRUITMENT_DISCLAIMER,
        brief,
        totalEvaluated: players.length,
        candidates: rankAmericanFootballRecruitmentCandidates(
          brief,
          players,
          profilesByPlayerId
        ),
      };
    }

    const percentileTable = brief.league
      ? await loadLeaguePercentileTable(brief.league, brief.position, season)
      : null;

    const profilesByPlayerId = new Map(
      players.map((player) => [
        player.id,
        buildSoccerIntelligenceProfile(player, { percentileTable }),
      ])
    );

    return {
      disclaimer: RECRUITMENT_DISCLAIMER,
      brief,
      totalEvaluated: players.length,
      candidates: rankRecruitmentCandidates(brief, players, profilesByPlayerId),
    };
  }
);
