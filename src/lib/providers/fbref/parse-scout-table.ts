import type { CanonicalSeasonMetric } from "@/lib/providers/types";

/** data-stat on FBref → the id we store. A missing or blank cell is not a zero. */
export const FBREF_STAT_TO_METRIC: Record<string, string> = {
  progressive_passes: "progressive_passes",
  progressive_carries: "progressive_carries",
  sca: "sca",
  gca: "gca",
  xg_assist: "xa",
  pressures: "pressures",
  passes_into_final_third: "passes_final_third",
  passes_into_penalty_area: "passes_penalty_area",
};

export const FBREF_TABLES = ["passing", "possession", "gca", "defense"] as const;

export function unwrapFbrefComments(html: string): string {
  return html.replace(/<!--([\s\S]*?)-->/g, (whole, body: string) =>
    body.includes("<table") ? body : whole
  );
}

export function parseStatNumber(raw: string): number | null {
  const cleaned = raw.replace(/,/g, "").replace(/%/g, "").trim();
  if (!cleaned) return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

interface ParsedRow {
  playerName: string;
  teamName: string | null;
  minutes90: number;
  values: Record<string, number>;
}

function cellText(inner: string): string {
  return inner
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function parseTableRows(tableHtml: string): ParsedRow[] {
  const rows: ParsedRow[] = [];
  const trRe = /<tr([^>]*)>([\s\S]*?)<\/tr>/g;
  let tr: RegExpExecArray | null;
  while ((tr = trRe.exec(tableHtml))) {
    const attrs = tr[1] ?? "";
    if (/\bpartial_table\b|\bthead\b/.test(attrs)) continue;
    const values: Record<string, number> = {};
    let playerName = "";
    let teamName: string | null = null;
    let minutes90 = 0;
    const cellRe = /<t[dh]([^>]*)>([\s\S]*?)<\/t[dh]>/g;
    let cell: RegExpExecArray | null;
    while ((cell = cellRe.exec(tr[2] ?? ""))) {
      const stat = /data-stat="([^"]+)"/.exec(cell[1] ?? "")?.[1];
      if (!stat) continue;
      const text = cellText(cell[2] ?? "");
      if (stat === "player") playerName = text;
      else if (stat === "team" || stat === "squad") teamName = text || null;
      else if (stat === "minutes_90s") minutes90 = parseStatNumber(text) ?? 0;
      else if (FBREF_STAT_TO_METRIC[stat]) {
        const value = parseStatNumber(text);
        if (value != null) values[FBREF_STAT_TO_METRIC[stat]] = value;
      }
    }
    if (!playerName || playerName === "Player") continue;
    rows.push({ playerName, teamName, minutes90, values });
  }
  return rows;
}

function tableSlice(html: string, tableId: string): string | null {
  const marker = `id="${tableId}"`;
  const start = html.indexOf(marker);
  if (start < 0) return null;
  const from = html.lastIndexOf("<table", start);
  const end = html.indexOf("</table>", start);
  if (from < 0 || end < 0) return null;
  return html.slice(from, end);
}

/**
 * Read one FBref stat page. Blank cells are omitted. A second row for the same
 * player keeps the line with more minutes, which is the season total.
 */
export function parseFbrefScoutPage(
  html: string,
  league: { leagueKey: string; season: number }
): CanonicalSeasonMetric[] {
  const unwrapped = unwrapFbrefComments(html);
  const merged = new Map<string, ParsedRow>();
  for (const table of FBREF_TABLES) {
    const slice = tableSlice(unwrapped, `stats_${table}`);
    if (!slice) continue;
    for (const row of parseTableRows(slice)) {
      const key = row.playerName.toLowerCase();
      const previous = merged.get(key);
      if (!previous || row.minutes90 >= previous.minutes90) {
        merged.set(key, {
          ...row,
          values: { ...(previous?.values ?? {}), ...row.values },
        });
      } else {
        previous.values = { ...row.values, ...previous.values };
      }
    }
  }

  const metrics: CanonicalSeasonMetric[] = [];
  for (const row of merged.values()) {
    for (const [metric, value] of Object.entries(row.values)) {
      metrics.push({
        playerName: row.playerName,
        teamName: row.teamName,
        season: league.season,
        leagueKey: league.leagueKey,
        metric,
        value,
      });
    }
  }
  return metrics;
}
