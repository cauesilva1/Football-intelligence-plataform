import type { Competition } from "@/types";

export interface TeamLeagueTab {
  key: string;
  label: string;
  competitionId?: string;
}

const TAB_DEFINITIONS = [
  { key: "all", label: "All" },
  {
    key: "premier-league",
    label: "Premier League",
    match: (name: string) => name.includes("premier"),
  },
  {
    key: "la-liga",
    label: "La Liga",
    match: (name: string) =>
      name.includes("la liga") ||
      (name.includes("liga") && !name.includes("bundesliga") && !name.includes("brasileir")),
  },
  {
    key: "serie-a",
    label: "Serie A",
    match: (name: string) => name.includes("serie a") || name.includes("serie adriatica"),
  },
  {
    key: "bundesliga",
    label: "Bundesliga",
    match: (name: string) => name.includes("bundesliga") || name.includes("bundes"),
  },
  {
    key: "ligue-1",
    label: "Ligue 1",
    match: (name: string) => name.includes("ligue 1") || name.includes("ligue"),
  },
  {
    key: "brasileirao",
    label: "Brasileirao",
    match: (name: string) => name.includes("brasileir"),
  },
] as const;

export function resolveTeamLeagueTabs(competitions: Competition[]): TeamLeagueTab[] {
  return TAB_DEFINITIONS.map((tab) => {
    if (tab.key === "all") {
      return { key: tab.key, label: tab.label };
    }

    const matchFn = "match" in tab ? tab.match : undefined;
    const competition = competitions.find((c) => matchFn?.(c.name.toLowerCase()));

    return {
      key: tab.key,
      label: tab.label,
      competitionId: competition?.id,
    };
  });
}

export function resolveCompetitionIdFromLeagueParam(
  leagueParam: string | undefined,
  tabs: TeamLeagueTab[]
): string | undefined {
  if (!leagueParam || leagueParam === "all") return undefined;

  const byKey = tabs.find((t) => t.key === leagueParam);
  if (byKey?.competitionId) return byKey.competitionId;

  if (leagueParam.startsWith("comp-")) return leagueParam;

  return tabs.find((t) => t.competitionId === leagueParam)?.competitionId ?? leagueParam;
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
