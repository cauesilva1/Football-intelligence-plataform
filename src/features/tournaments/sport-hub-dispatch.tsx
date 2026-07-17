import { redirect } from "next/navigation";
import { SoccerCompetitionHub } from "@/features/tournaments/soccer-competition-hub";
import { BasketballCompetitionHub } from "@/features/tournaments/basketball-competition-hub";
import { AmericanFootballCompetitionHub } from "@/features/tournaments/american-football-competition-hub";
import { BasketballTournamentsIndex } from "@/features/tournaments/basketball-tournaments-index";
import { AmericanFootballTournamentsIndex } from "@/features/tournaments/american-football-tournaments-index";
import { SoccerTournamentsIndex } from "@/features/tournaments/soccer-tournaments-index";
import {
  getSoccerCompetition,
  isSoccerCompetitionSlug,
} from "@/lib/tournaments/soccer-competitions";
import {
  getBasketballCompetition,
  isBasketballCompetitionSlug,
} from "@/lib/tournaments/basketball-competitions";
import {
  getAmericanFootballCompetition,
  isAmericanFootballCompetitionSlug,
} from "@/lib/tournaments/american-football-competitions";
import { loadCompetitionHubData } from "@/lib/tournaments/competition-hub-data";
import { loadBasketballCompetitionHub } from "@/lib/tournaments/basketball-hub-data";
import { loadAmericanFootballCompetitionHub } from "@/lib/tournaments/american-football-hub-data";
import { fetchStatsBombMatches } from "@/lib/statsbomb/fetch-matches";
import { TOURNAMENTS } from "@/lib/statsbomb/constants";
import { loadWorldCup2026Matches } from "@/lib/tournaments/world-cup-2026";
import {
  fromStatsBombMatch,
  groupTournamentMatches,
} from "@/lib/tournaments/match-normalizer";
import { enrichTournamentRoundsWithCrests } from "@/lib/tournaments/enrich-crests";
import { getSportConfig } from "@/lib/sport-registry";
import type { Sport } from "@/lib/sport";
import type { TournamentRound } from "@/lib/tournaments/types";
import type { ReactNode } from "react";

async function loadHistoricalRounds(
  editionIds: string[]
): Promise<Record<string, TournamentRound[]>> {
  const roundsByTournament: Record<string, TournamentRound[]> = {};

  await Promise.all(
    TOURNAMENTS.filter((t) => editionIds.includes(t.id)).map(async (tournament) => {
      try {
        if (tournament.source === "scraped") {
          const raw = await loadWorldCup2026Matches();
          const matches = raw.map((m) => fromStatsBombMatch(m, "scraped"));
          const rounds = groupTournamentMatches(matches);
          roundsByTournament[tournament.id] = await enrichTournamentRoundsWithCrests(rounds);
          return;
        }

        if (tournament.competitionId != null && tournament.seasonId != null) {
          const raw = await fetchStatsBombMatches(tournament.competitionId, tournament.seasonId);
          const matches = raw.map((m) => fromStatsBombMatch(m));
          const rounds = groupTournamentMatches(matches);
          roundsByTournament[tournament.id] = await enrichTournamentRoundsWithCrests(rounds);
        }
      } catch (error) {
        console.warn(`[tournaments/${tournament.id}] load failed:`, error);
        roundsByTournament[tournament.id] = [];
      }
    })
  );

  return roundsByTournament;
}

export function renderTournamentsIndex(sport: Sport): ReactNode {
  const { hubKind } = getSportConfig(sport);
  if (hubKind === "basketball") return <BasketballTournamentsIndex />;
  if (hubKind === "american-football") return <AmericanFootballTournamentsIndex />;
  return <SoccerTournamentsIndex />;
}

export async function resolveCompetitionTitle(
  sport: Sport,
  slug: string
): Promise<string | null> {
  const { hubKind } = getSportConfig(sport);
  if (hubKind === "basketball") {
    return getBasketballCompetition(slug)?.shortName ?? null;
  }
  if (hubKind === "american-football") {
    return getAmericanFootballCompetition(slug)?.shortName ?? null;
  }
  return getSoccerCompetition(slug)?.shortName ?? null;
}

/** Sport implied by the competition slug — avoids cookies() on hub pages. */
export function resolveSportFromCompetitionSlug(slug: string): Sport | null {
  if (isBasketballCompetitionSlug(slug)) return "BASKETBALL";
  if (isAmericanFootballCompetitionSlug(slug)) return "AMERICAN_FOOTBALL";
  if (isSoccerCompetitionSlug(slug)) return "SOCCER";
  return null;
}

export async function resolveCompetitionTitleFromSlug(slug: string): Promise<string | null> {
  const sport = resolveSportFromCompetitionSlug(slug);
  if (!sport) return null;
  return resolveCompetitionTitle(sport, slug);
}

export async function renderCompetitionHub(options: {
  sport: Sport;
  slug: string;
  seasonYear?: number;
}): Promise<{ subtitle: string; node: ReactNode }> {
  const { hubKind } = getSportConfig(options.sport);

  if (hubKind === "basketball") {
    if (!isBasketballCompetitionSlug(options.slug)) redirect("/tournaments");
    const competition = getBasketballCompetition(options.slug)!;
    const data = await loadBasketballCompetitionHub(competition, {
      seasonYear: options.seasonYear,
    });
    return {
      subtitle: competition.shortName,
      node: <BasketballCompetitionHub competition={competition} data={data} />,
    };
  }

  if (hubKind === "american-football") {
    if (!isAmericanFootballCompetitionSlug(options.slug)) redirect("/tournaments");
    const competition = getAmericanFootballCompetition(options.slug)!;
    const data = await loadAmericanFootballCompetitionHub(competition, {
      seasonYear: options.seasonYear,
    });
    return {
      subtitle: competition.shortName,
      node: <AmericanFootballCompetitionHub competition={competition} data={data} />,
    };
  }

  if (!isSoccerCompetitionSlug(options.slug)) redirect("/tournaments");
  const competition = getSoccerCompetition(options.slug)!;
  const hub = await loadCompetitionHubData(competition);
  const historicalRounds = competition.editionIds?.length
    ? await loadHistoricalRounds(competition.editionIds)
    : undefined;

  return {
    subtitle: competition.shortName,
    node: (
      <SoccerCompetitionHub
        competition={competition}
        standings={hub.standings}
        matches={hub.matches}
        leaders={hub.leaders}
        notice={hub.notice}
        historicalRounds={historicalRounds}
      />
    ),
  };
}
