import type { Sport } from "@/lib/sport";
import { ensureBrasileiraoCompetition } from "@/lib/sync/brasileirao-bootstrap";
import { ensureMlsCompetition } from "@/lib/sync/mls-bootstrap";
import { ensureNbaCompetition } from "@/lib/sync/nba-bootstrap";
import { ensureNcaaCompetition } from "@/lib/sync/ncaa-bootstrap";
import { ensureNflCompetition } from "@/lib/sync/nfl-bootstrap";
import { ensureCfbCompetition } from "@/lib/sync/cfb-bootstrap";

const BASKETBALL_COMPETITION_NAMES = ["NBA", "NCAA Men's Basketball"] as const;
const AMERICAN_FOOTBALL_COMPETITION_NAMES = ["NFL", "College Football"] as const;

/**
 * Central sport registry — add a sport by appending an entry here
 * (theme, competition filter, bootstrap, UI maps) instead of scattering if/else.
 */
export interface SportUiMaps {
  radarMetrics: readonly string[];
  compareCategories: readonly string[];
  teamsSubtitle: string;
  tournamentsSubtitle: string;
  directoryTitle: string;
  entityLabel: string;
  rankingPresetSport: Sport;
}

export interface SportConfig {
  id: Sport;
  label: string;
  shortLabel: string;
  tagline: string;
  /** True when a competition name belongs to this sport — never “not X = soccer”. */
  isCompetition: (name: string) => boolean;
  runBootstrap: () => Promise<void>;
  ui: SportUiMaps;
  /** Hub / match detail kind for route dispatchers. */
  hubKind: "soccer" | "basketball" | "american-football";
  matchKind: "soccer" | "basketball" | "american-football";
}

function isBasketballCompetitionName(name: string): boolean {
  const n = name.trim();
  if ((BASKETBALL_COMPETITION_NAMES as readonly string[]).includes(n)) return true;
  const lower = n.toLowerCase();
  return (
    lower === "nba" ||
    lower.includes("ncaa") ||
    lower.includes("college basketball") ||
    lower.includes("national basketball")
  );
}

function isAmericanFootballCompetitionName(name: string): boolean {
  const n = name.trim();
  if ((AMERICAN_FOOTBALL_COMPETITION_NAMES as readonly string[]).includes(n)) return true;
  const lower = n.toLowerCase();
  return (
    lower === "nfl" ||
    lower.includes("college football") ||
    lower.includes("national football league") ||
    (lower.includes("cfb") && !lower.includes("basket"))
  );
}

function isSoccerCompetitionName(name: string): boolean {
  if (!name.trim()) return false;
  if (isBasketballCompetitionName(name)) return false;
  if (isAmericanFootballCompetitionName(name)) return false;
  return true;
}

export const SPORT_REGISTRY: Record<Sport, SportConfig> = {
  SOCCER: {
    id: "SOCCER",
    label: "Futebol",
    shortLabel: "Soccer",
    tagline: "Pitch Intelligence",
    isCompetition: isSoccerCompetitionName,
    runBootstrap: async () => {
      await Promise.all([ensureBrasileiraoCompetition(), ensureMlsCompetition()]);
    },
    hubKind: "soccer",
    matchKind: "soccer",
    ui: {
      radarMetrics: ["Finishing", "Creation", "Passing", "Dribbling", "Defense", "Physical"],
      compareCategories: [
        "Attack",
        "Creativity",
        "Finishing",
        "Passing",
        "Physical",
        "Defense",
      ],
      teamsSubtitle: "Clubes",
      tournamentsSubtitle: "Torneios",
      directoryTitle: "Diretório de Clubes",
      entityLabel: "clubes",
      rankingPresetSport: "SOCCER",
    },
  },
  BASKETBALL: {
    id: "BASKETBALL",
    label: "Basquete",
    shortLabel: "Hoops",
    tagline: "Court Intelligence",
    isCompetition: isBasketballCompetitionName,
    runBootstrap: async () => {
      await Promise.all([ensureNbaCompetition(), ensureNcaaCompetition()]);
    },
    hubKind: "basketball",
    matchKind: "basketball",
    ui: {
      radarMetrics: ["Scoring", "Rebounding", "Playmaking", "Defense", "FG%", "3P%"],
      compareCategories: [
        "Scoring",
        "Rebounding",
        "Playmaking",
        "Defense",
        "Shooting",
        "Efficiency",
      ],
      teamsSubtitle: "Franquias",
      tournamentsSubtitle: "Ligas",
      directoryTitle: "Franquias & Universidades",
      entityLabel: "franquias / programas",
      rankingPresetSport: "BASKETBALL",
    },
  },
  AMERICAN_FOOTBALL: {
    id: "AMERICAN_FOOTBALL",
    label: "Futebol Americano",
    shortLabel: "NFL",
    tagline: "Gridiron Intelligence",
    isCompetition: isAmericanFootballCompetitionName,
    runBootstrap: async () => {
      await Promise.all([ensureNflCompetition(), ensureCfbCompetition()]);
    },
    hubKind: "american-football",
    matchKind: "american-football",
    ui: {
      radarMetrics: ["Passing", "Rushing", "Receiving", "Defense", "Tackles", "Sacks"],
      compareCategories: [
        "Passing",
        "Rushing",
        "Receiving",
        "Defense",
        "Special Teams",
        "Efficiency",
      ],
      teamsSubtitle: "Franquias",
      tournamentsSubtitle: "Ligas",
      directoryTitle: "Franquias & Programas",
      entityLabel: "franquias / programas",
      rankingPresetSport: "AMERICAN_FOOTBALL",
    },
  },
};

export const SPORT_IDS = Object.keys(SPORT_REGISTRY) as Sport[];

export function getSportConfig(sport: Sport): SportConfig {
  return SPORT_REGISTRY[sport] ?? SPORT_REGISTRY.SOCCER;
}

export function parseSportId(value?: string | null): Sport {
  if (value && value in SPORT_REGISTRY) return value as Sport;
  return "SOCCER";
}

export function competitionBelongsToSport(name: string, sport: Sport): boolean {
  return getSportConfig(sport).isCompetition(name);
}
