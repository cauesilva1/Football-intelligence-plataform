import { toRadarProfile } from "@/lib/normalize";
import type { Player } from "@/types";

export interface PlayingStyle {
  label: string;
  description: string;
  traits: string[];
}

const STYLE_BY_DIMENSION: Record<string, { label: string; description: string }> = {
  Finalização: {
    label: "Finalizador",
    description: "Volume de finalização e conversão de chances acima da média para a posição.",
  },
  Criação: {
    label: "Criador",
    description: "Participação ativa na última fase ofensiva e geração de oportunidades.",
  },
  Passe: {
    label: "Construtor",
    description: "Distribuição segura e progressão de posse com passes verticais.",
  },
  Drible: {
    label: "Desequilibrador",
    description: "Condução em 1x1 e capacidade de quebrar linhas defensivas.",
  },
  Defesa: {
    label: "Recuperador",
    description: "Antecipação, desarmes e cobertura defensiva consistentes.",
  },
  Físico: {
    label: "Dominante",
    description: "Vantagem em duelos físicos e disputas de segunda bola.",
  },
};

/** Product-facing playing style derived from normalized radar dimensions. */
export function derivePlayingStyle(player: Player): PlayingStyle {
  const profile = toRadarProfile(player.currentSeasonStats);
  const ranked = Object.entries(profile).sort(([, a], [, b]) => b - a);
  const [topKey, topValue] = ranked[0];
  const [secondKey] = ranked[1];

  const primary = STYLE_BY_DIMENSION[topKey];
  const secondary = STYLE_BY_DIMENSION[secondKey];

  const traits = [
    `${topKey} (${Math.round(topValue)}/100)`,
    `${secondKey} (${Math.round(profile[secondKey])}/100)`,
    player.preferredFoot === "BOTH" ? "Ambidestro" : `Pé ${player.preferredFoot === "LEFT" ? "esquerdo" : "direito"}`,
  ];

  if (player.position === "GK") {
    return {
      label: "Guardião",
      description: "Perfil orientado a reflexos, leitura de jogo e organização defensiva.",
      traits: ["Jogo aéreo", "Saída de gol", "Distribuição"],
    };
  }

  return {
    label: primary?.label ?? "Perfil híbrido",
    description: `${primary?.description ?? ""} Complementado por tendência de ${secondary?.label.toLowerCase() ?? "jogo equilibrado"}.`,
    traits,
  };
}
