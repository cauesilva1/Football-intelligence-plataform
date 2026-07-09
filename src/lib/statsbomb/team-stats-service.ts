import { cache } from "react";
import { isDbSource } from "@/lib/data-source";
import { logSupabaseError } from "@/lib/db-errors";
import { getEspnStatsForTeam, preloadEspnLeague } from "@/lib/crests/espn-standings";
import { fetchStatsBombMatches } from "./fetch-matches";
import {
  aggregateTeamStatsFromMatches,
  findStatsBombStatsForTeam,
  type AggregatedTeamStats,
} from "./aggregate-team-stats";
import {
  leagueCacheKey,
  resolveStatsBombLeague,
  type StatsBombLeagueSource,
} from "./league-map";

function hasMeaningfulStats(stats: AggregatedTeamStats | null | undefined): boolean {
  if (!stats) return false;
  return stats.matchesPlayed > 0 || stats.wins > 0 || stats.goalsFor > 0;
}

const tableCache = new Map<string, Map<string, AggregatedTeamStats>>();

async function loadLeagueTable(source: StatsBombLeagueSource): Promise<Map<string, AggregatedTeamStats>> {
  const key = leagueCacheKey(source);
  const cached = tableCache.get(key);
  if (cached) return cached;

  const matches = await fetchStatsBombMatches(source.competitionId, source.seasonId);
  const table = aggregateTeamStatsFromMatches(
    matches,
    source.seasonLabel,
    source.statsBombCompetitionName
  );
  tableCache.set(key, table);
  return table;
}

export const getStatsBombStatsForTeam = cache(
  async (
    teamName: string,
    competitionName?: string | null
  ): Promise<AggregatedTeamStats | null> => {
    if (isDbSource()) {
      try {
        const espnStats = await getEspnStatsForTeam(teamName, competitionName);
        if (hasMeaningfulStats(espnStats)) return espnStats;
      } catch (error) {
        logSupabaseError(`getStatsBombStatsForTeam:espn:${teamName}`, error);
      }
      return null;
    }

    let statsBombResult: AggregatedTeamStats | null = null;

    const source = resolveStatsBombLeague(competitionName);
    if (source) {
      try {
        const table = await loadLeagueTable(source);
        statsBombResult = findStatsBombStatsForTeam(table, teamName);
      } catch (error) {
        console.warn("[statsbomb] Falha ao carregar stats do time:", teamName, error);
      }
    }

    if (hasMeaningfulStats(statsBombResult)) {
      return statsBombResult;
    }

    try {
      const espnStats = await getEspnStatsForTeam(teamName, competitionName);
      if (hasMeaningfulStats(espnStats)) {
        return espnStats;
      }
    } catch (error) {
      console.warn("[espn] Falha ao carregar stats do time:", teamName, error);
    }

    return statsBombResult;
  }
);

export const preloadStatsBombLeague = cache(async (competitionName?: string | null) => {
  if (!isDbSource()) {
    const source = resolveStatsBombLeague(competitionName);
    if (source) {
      try {
        await loadLeagueTable(source);
      } catch {
        // StatsBomb indisponível — ESPN assume no getStatsBombStatsForTeam
      }
    }
  }

  await preloadEspnLeague(competitionName);
  return null;
});
