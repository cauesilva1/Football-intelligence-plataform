import type { NhlStandingRow } from "@/lib/api/nhl";
import { compactHockeySeason, nhlApiSeasonId } from "@/lib/hockey/season";
import { formatSeasonLabel } from "@/lib/format/season-label";

export interface HockeyClubStat {
  label: "GP" | "W" | "L" | "OT" | "PTS" | "GF" | "GA";
  value: number;
}

export interface HockeyClubDirectoryModel {
  seasonLabel: string;
  crestUrl: string | null;
  rosterLabel: string;
  stats: HockeyClubStat[] | null;
}

/** Directory phrasing is the compact hockey season ("2026-27"), without a soccer slash. */
export function hockeyDirectorySeasonLabel(now = new Date()): string {
  const compact = String(compactHockeySeason(nhlApiSeasonId(now)));
  return formatSeasonLabel(compact, "HOCKEY").replace(/ regular season$/, "");
}

export function hockeyClubDirectoryModel(input: {
  shortName: string;
  squadSize: number;
  standings: NhlStandingRow[];
  now?: Date;
}): HockeyClubDirectoryModel {
  const row = input.standings.find((standing) => standing.abbrev === input.shortName);
  const count = input.squadSize > 0 ? input.squadSize : null;
  return {
    seasonLabel: hockeyDirectorySeasonLabel(input.now),
    crestUrl: row?.logoUrl ?? null,
    rosterLabel: count == null ? "Roster not loaded" : `${count} players`,
    stats: row
      ? [
          { label: "GP", value: row.gamesPlayed },
          { label: "W", value: row.wins },
          { label: "L", value: row.losses },
          { label: "OT", value: row.otLosses },
          { label: "PTS", value: row.points },
          { label: "GF", value: row.goalsFor },
          { label: "GA", value: row.goalsAgainst },
        ]
      : null,
  };
}
