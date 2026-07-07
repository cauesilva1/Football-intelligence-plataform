import type { TournamentConfig } from "@/lib/tournaments/types";

export const STATSBOMB_RAW_BASE =
  "https://raw.githubusercontent.com/statsbomb/open-data/master/data/matches";

export const TOURNAMENTS: TournamentConfig[] = [
  {
    id: "wc-2026",
    label: "Copa do Mundo 2026",
    description: "EUA · México · Canadá · scraper ESPN + cache local",
    source: "scraped",
  },
  {
    id: "wc-2022",
    label: "Copa do Mundo 2022",
    description: "Qatar · 32 seleções · StatsBomb Open Data",
    source: "statsbomb",
    competitionId: 43,
    seasonId: 106,
  },
  {
    id: "wc-2018",
    label: "Copa do Mundo 2018",
    description: "Rússia · edição histórica",
    source: "statsbomb",
    competitionId: 43,
    seasonId: 3,
  },
  {
    id: "eu-2020",
    label: "Euro 2020",
    description: "Europa · campeã Itália",
    source: "statsbomb",
    competitionId: 55,
    seasonId: 43,
  },
];

export const STAGE_ORDER: Record<string, number> = {
  "Group Stage": 1,
  "Round of 32": 2,
  "Round of 16": 3,
  "Quarter-finals": 4,
  "Semi-finals": 5,
  "Third Place": 5,
  Final: 6,
};

export const STAGE_LABELS_PT: Record<string, string> = {
  "Group Stage": "Fase de Grupos",
  "Round of 32": "Rodada de 32",
  "Round of 16": "Oitavas de Final",
  "Quarter-finals": "Quartas de Final",
  "Semi-finals": "Semifinal",
  "Third Place": "Disputa do 3º Lugar",
  Final: "Final",
};
