import { STATSBOMB_RAW_BASE, STAGE_LABELS_PT } from "./constants";
import type { StatsBombMatch } from "./types";

export async function fetchStatsBombMatches(
  competitionId: number,
  seasonId: number
): Promise<StatsBombMatch[]> {
  const url = `${STATSBOMB_RAW_BASE}/${competitionId}/${seasonId}.json`;

  const response = await fetch(url, {
    next: { revalidate: 60 * 60 * 24 },
  });

  if (!response.ok) {
    throw new Error(`StatsBomb fetch failed: ${response.status} ${url}`);
  }

  return response.json() as Promise<StatsBombMatch[]>;
}

export function formatStageLabel(stageName: string): string {
  return STAGE_LABELS_PT[stageName] ?? stageName;
}

export function formatMatchDate(date: string, kickOff: string): string {
  const [hours, minutes] = kickOff.split(":");
  const parsed = new Date(`${date}T${hours}:${minutes}:00`);
  return parsed.toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
