import type { PlayerStatistic } from "@/types";

export interface PlayerStatus {
  label: string;
  description: string;
  variant: "default" | "azure" | "amber" | "neutral";
}

/** Derives squad role from minutes and appearances (mock-season context). */
export function derivePlayerStatus(stats: PlayerStatistic): PlayerStatus {
  const { minutesPlayed, appearances, rating } = stats;

  if (minutesPlayed >= 1_200 && appearances >= 14) {
    return {
      label: "Titular",
      description: "Minutos consistentes na temporada",
      variant: "default",
    };
  }
  if (minutesPlayed >= 600 && appearances >= 8) {
    return {
      label: "Rotação",
      description: "Participação regular em rodadas",
      variant: "azure",
    };
  }
  if (rating >= 7.2 && minutesPlayed < 600) {
    return {
      label: "Prospect",
      description: "Alto impacto em minutos limitados",
      variant: "amber",
    };
  }
  return {
    label: "Elenco",
    description: "Minutos reduzidos na temporada",
    variant: "neutral",
  };
}
