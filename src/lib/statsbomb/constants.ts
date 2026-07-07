import type { TournamentConfig } from "@/lib/tournaments/types";

export const STATSBOMB_RAW_BASE =
  "https://raw.githubusercontent.com/statsbomb/open-data/master/data/matches";

export const TOURNAMENTS: TournamentConfig[] = [
  {
    id: "wc-2026",
    label: "FIFA World Cup 2026",
    description: "USA · Mexico · Canada · ESPN scraper + local cache",
    source: "scraped",
  },
  {
    id: "wc-2022",
    label: "FIFA World Cup 2022",
    description: "Qatar · 32 nations · StatsBomb Open Data",
    source: "statsbomb",
    competitionId: 43,
    seasonId: 106,
  },
  {
    id: "wc-2018",
    label: "FIFA World Cup 2018",
    description: "Russia · historical edition",
    source: "statsbomb",
    competitionId: 43,
    seasonId: 3,
  },
  {
    id: "eu-2020",
    label: "UEFA Euro 2020",
    description: "Europe · Italy champions",
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

export const STAGE_LABELS: Record<string, string> = {
  "Group Stage": "Group Stage",
  "Round of 32": "Round of 32",
  "Round of 16": "Round of 16",
  "Quarter-finals": "Quarter-finals",
  "Semi-finals": "Semi-finals",
  "Third Place": "Third Place",
  Final: "Final",
};

/** @deprecated Use STAGE_LABELS */
export const STAGE_LABELS_PT = STAGE_LABELS;
