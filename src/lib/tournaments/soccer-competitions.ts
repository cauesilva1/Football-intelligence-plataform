import {
  BRAZIL_SEASON_LABEL,
  CURRENT_SEASON,
  ESPN_BRAZIL_SEASON_YEAR,
  ESPN_EUROPEAN_SEASON_YEAR,
  ESPN_MLS_SEASON_YEAR,
  ESPN_MLS_SLUG,
  FIFA_WORLD_CUP_LABEL,
  FIFA_WORLD_CUP_SEASON_YEAR,
  FIFA_WORLD_CUP_SLUG,
  MLS_LABEL,
  MLS_SEASON_LABEL,
} from "@/lib/seasons";
import { TOURNAMENTS } from "@/lib/statsbomb/constants";

export type SoccerCompetitionKind = "domestic" | "continental" | "national";
export type SoccerCompetitionDataMode = "espn-db" | "scraped-wc" | "statsbomb" | "espn-live";
export type SoccerCompetitionRegion = "brazil" | "europe" | "americas" | "international";

export interface SoccerCompetitionConfig {
  slug: string;
  name: string;
  shortName: string;
  description: string;
  kind: SoccerCompetitionKind;
  dataMode: SoccerCompetitionDataMode;
  region: SoccerCompetitionRegion;
  espnSlug?: string;
  espnCompetitionLabel?: string;
  seasonYear?: number;
  seasonLabel?: string;
  editionIds?: string[];
  badge: string;
}

export const SOCCER_COMPETITIONS: SoccerCompetitionConfig[] = [
  {
    slug: "brasileirao",
    name: "Brasileirão Série A",
    shortName: "Brasileirão",
    description: "Tabela, artilharia, jogos e estatísticas da Série A.",
    kind: "domestic",
    dataMode: "espn-db",
    region: "brazil",
    espnSlug: "bra.1",
    espnCompetitionLabel: "Brasileirão Série A",
    seasonYear: ESPN_BRAZIL_SEASON_YEAR,
    seasonLabel: BRAZIL_SEASON_LABEL,
    badge: "Brasil",
  },
  {
    slug: "mls",
    name: MLS_LABEL,
    shortName: "MLS",
    description: "Conferências Leste/Oeste, artilharia, jogos e elencos da temporada 2026.",
    kind: "domestic",
    dataMode: "espn-live",
    region: "americas",
    espnSlug: ESPN_MLS_SLUG,
    espnCompetitionLabel: MLS_LABEL,
    seasonYear: ESPN_MLS_SEASON_YEAR,
    seasonLabel: MLS_SEASON_LABEL,
    badge: "EUA / Canadá",
  },
  {
    slug: "premier-league",
    name: "Premier League",
    shortName: "Premier League",
    description: "Classificação, líderes e jogos da liga inglesa.",
    kind: "domestic",
    dataMode: "espn-live",
    region: "europe",
    espnSlug: "eng.1",
    espnCompetitionLabel: "Premier League",
    seasonYear: ESPN_EUROPEAN_SEASON_YEAR,
    seasonLabel: CURRENT_SEASON,
    badge: "Inglaterra",
  },
  {
    slug: "la-liga",
    name: "La Liga",
    shortName: "La Liga",
    description: "Tabela e estatísticas da liga espanhola.",
    kind: "domestic",
    dataMode: "espn-live",
    region: "europe",
    espnSlug: "esp.1",
    espnCompetitionLabel: "La Liga",
    seasonYear: ESPN_EUROPEAN_SEASON_YEAR,
    seasonLabel: CURRENT_SEASON,
    badge: "Espanha",
  },
  {
    slug: "serie-a",
    name: "Serie A",
    shortName: "Serie A",
    description: "Classificação e líderes da liga italiana.",
    kind: "domestic",
    dataMode: "espn-live",
    region: "europe",
    espnSlug: "ita.1",
    espnCompetitionLabel: "Serie A",
    seasonYear: ESPN_EUROPEAN_SEASON_YEAR,
    seasonLabel: CURRENT_SEASON,
    badge: "Itália",
  },
  {
    slug: "bundesliga",
    name: "Bundesliga",
    shortName: "Bundesliga",
    description: "Tabela e jogos da liga alemã.",
    kind: "domestic",
    dataMode: "espn-live",
    region: "europe",
    espnSlug: "ger.1",
    espnCompetitionLabel: "Bundesliga",
    seasonYear: ESPN_EUROPEAN_SEASON_YEAR,
    seasonLabel: CURRENT_SEASON,
    badge: "Alemanha",
  },
  {
    slug: "ligue-1",
    name: "Ligue 1",
    shortName: "Ligue 1",
    description: "Classificação e estatísticas da liga francesa.",
    kind: "domestic",
    dataMode: "espn-live",
    region: "europe",
    espnSlug: "fra.1",
    espnCompetitionLabel: "Ligue 1",
    seasonYear: ESPN_EUROPEAN_SEASON_YEAR,
    seasonLabel: CURRENT_SEASON,
    badge: "França",
  },
  {
    slug: "champions",
    name: "UEFA Champions League",
    shortName: "Champions",
    description: "Fase de liga, jogos e classificação europeia.",
    kind: "continental",
    dataMode: "espn-live",
    region: "europe",
    espnSlug: "uefa.champions",
    espnCompetitionLabel: "UEFA Champions League",
    seasonYear: ESPN_EUROPEAN_SEASON_YEAR,
    seasonLabel: CURRENT_SEASON,
    badge: "UEFA",
  },
  {
    slug: "euro",
    name: "UEFA Euro",
    shortName: "Euro",
    description: "Arquivo StatsBomb — Euro 2020 e edições históricas.",
    kind: "national",
    dataMode: "statsbomb",
    region: "international",
    editionIds: TOURNAMENTS.filter((t) => t.id.startsWith("eu-")).map((t) => t.id),
    badge: "Seleções",
  },
  {
    slug: "world-cup",
    name: FIFA_WORLD_CUP_LABEL,
    shortName: "Copa do Mundo",
    description: "Copa 2026 ao vivo + edições históricas StatsBomb.",
    kind: "national",
    dataMode: "scraped-wc",
    region: "international",
    espnSlug: FIFA_WORLD_CUP_SLUG,
    espnCompetitionLabel: FIFA_WORLD_CUP_LABEL,
    seasonYear: FIFA_WORLD_CUP_SEASON_YEAR,
    editionIds: TOURNAMENTS.filter((t) => t.id.startsWith("wc-")).map((t) => t.id),
    badge: "FIFA",
  },
];

export function getSoccerCompetition(slug: string): SoccerCompetitionConfig | undefined {
  return SOCCER_COMPETITIONS.find((c) => c.slug === slug);
}

export function isSoccerCompetitionSlug(slug: string): boolean {
  return SOCCER_COMPETITIONS.some((c) => c.slug === slug);
}

export const REGION_LABELS: Record<SoccerCompetitionRegion, string> = {
  brazil: "Brasil",
  americas: "Américas",
  europe: "Europa",
  international: "Seleções",
};
