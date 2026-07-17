import type { Competition } from "@/types";
import { competitionBelongsToSport, type Sport } from "@/lib/sport";

export interface TeamLeagueTab {
  key: string;
  label: string;
  competitionId?: string;
}

type LeagueDef = {
  key: string;
  label: string;
  match?: (name: string) => boolean;
};

const SOCCER_TAB_DEFINITIONS: LeagueDef[] = [
  { key: "all", label: "Todos" },
  {
    key: "premier-league",
    label: "Premier League",
    match: (name) => name.includes("premier"),
  },
  {
    key: "la-liga",
    label: "La Liga",
    match: (name) =>
      name.includes("la liga") ||
      (name.includes("liga") && !name.includes("bundesliga") && !name.includes("brasileir")),
  },
  {
    key: "serie-a",
    label: "Serie A",
    match: (name) =>
      (name.includes("serie a") || name.includes("serie adriatica")) && !name.includes("brasileir"),
  },
  {
    key: "bundesliga",
    label: "Bundesliga",
    match: (name) => name.includes("bundesliga") || name.includes("bundes"),
  },
  {
    key: "ligue-1",
    label: "Ligue 1",
    match: (name) => name.includes("ligue 1") || name.includes("ligue"),
  },
  {
    key: "brasileirao",
    label: "Brasileirão",
    match: (name) => name.includes("brasileir"),
  },
  {
    key: "mls",
    label: "MLS",
    match: (name) => name.includes("mls") || name.includes("major league"),
  },
];

const BASKETBALL_TAB_DEFINITIONS: LeagueDef[] = [
  { key: "all", label: "Todos" },
  {
    key: "nba",
    label: "NBA",
    match: (name) => name === "nba",
  },
  {
    key: "ncaa",
    label: "NCAA",
    match: (name) => name.includes("ncaa"),
  },
];

const AMERICAN_FOOTBALL_TAB_DEFINITIONS: LeagueDef[] = [
  { key: "all", label: "Todos" },
  {
    key: "nfl",
    label: "NFL",
    match: (name) => name === "nfl" || name.includes("national football"),
  },
  {
    key: "cfb",
    label: "CFB",
    match: (name) => name.includes("college football") || name === "cfb",
  },
];

function buildTabs(competitions: Competition[], definitions: LeagueDef[]): TeamLeagueTab[] {
  return definitions.map((tab) => {
    if (tab.key === "all") {
      return { key: tab.key, label: tab.label };
    }

    const competition = competitions.find((c) => tab.match?.(c.name.toLowerCase()));

    return {
      key: tab.key,
      label: tab.label,
      competitionId: competition?.id,
    };
  });
}

function tabDefinitionsForSport(sport: Sport): LeagueDef[] {
  if (sport === "BASKETBALL") return BASKETBALL_TAB_DEFINITIONS;
  if (sport === "AMERICAN_FOOTBALL") return AMERICAN_FOOTBALL_TAB_DEFINITIONS;
  return SOCCER_TAB_DEFINITIONS;
}

export function resolveTeamLeagueTabs(competitions: Competition[], sport: Sport = "SOCCER"): TeamLeagueTab[] {
  const scoped = competitions.filter((c) => competitionBelongsToSport(c.name, sport));
  return buildTabs(scoped, tabDefinitionsForSport(sport));
}

export function resolveCompetitionIdFromLeagueParam(
  leagueParam: string | undefined,
  tabs: TeamLeagueTab[]
): string | undefined {
  if (!leagueParam || leagueParam === "all") return undefined;

  const byKey = tabs.find((t) => t.key === leagueParam);
  if (byKey?.competitionId) return byKey.competitionId;

  if (leagueParam.startsWith("comp-")) return leagueParam;

  return tabs.find((t) => t.competitionId === leagueParam)?.competitionId;
}

/** Match a competition/team league name against a filter tab key (works without DB id). */
export function competitionMatchesLeagueKey(
  competitionName: string | undefined | null,
  leagueKey: string | undefined,
  sport: Sport = "SOCCER"
): boolean {
  if (!leagueKey || leagueKey === "all") return true;
  if (!competitionName) return false;

  const definitions = tabDefinitionsForSport(sport);
  const def = definitions.find((d) => d.key === leagueKey);
  if (!def?.match) return false;
  return def.match(competitionName.toLowerCase());
}

export function resolveActiveLeagueKey(
  leagueParam: string | undefined,
  tabs: TeamLeagueTab[]
): string {
  if (!leagueParam || leagueParam === "all") return "all";

  const byKey = tabs.find((t) => t.key === leagueParam);
  if (byKey) return byKey.key;

  const byId = tabs.find((t) => t.competitionId === leagueParam);
  if (byId) return byId.key;

  return "all";
}
