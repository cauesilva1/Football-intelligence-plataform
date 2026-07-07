import { derivePlayingStyle } from "@/features/scouting/lib/playing-style";
import type { Player, ScoutingReport, TacticalFit } from "@/lib/types";
import { formatMarketValue } from "@/lib/utils";

// ==========================================================
// Mock AI scouting report generator.
//
// This module intentionally isolates the "AI call" behind a single
// function boundary (`generateScoutingReport`) so that swapping the
// mock implementation for a real LLM call (Anthropic API, etc.) later
// only requires changing this file - callers are unaffected.
// ==========================================================

function buildRecommendation(rating: number, age: number): string {
  if (rating >= 8.2) return age < 26 ? "Prioridade máxima de contratação - alto potencial de revenda" : "Contratação recomendada para impacto imediato";
  if (rating >= 7.3) return "Recomendado para reforço de elenco, monitorar evolução na próxima janela";
  if (rating >= 6.5) return "Opção viável como peça de rotação, revisar em 6 meses";
  return "Não recomendado no momento - acompanhar em competições de base";
}

function buildSummary(player: Player): string {
  const s = player.currentSeasonStats;
  const p90 = s.per90;
  return [
    `${player.knownAs} (${player.age} anos, ${player.position}) disputou ${s.appearances} partidas (${s.minutesPlayed.toLocaleString("pt-BR")} min) na temporada 2025/26. `,
    `Produção normalizada: ${p90.goals.toFixed(2)} gols/90 e ${p90.assists.toFixed(2)} assistências/90. `,
    `Valor de mercado estimado em ${formatMarketValue(player.marketValue)} com rating médio de ${s.rating.toFixed(1)} `,
    `e ${s.passAccuracy.toFixed(0)}% de precisão de passe.`,
  ].join("");
}

function buildTacticalFit(player: Player): TacticalFit {
  const s = player.currentSeasonStats;
  const p90 = s.per90;
  const pos = player.position;

  const systems: string[] = [];
  const roles: string[] = [];

  if (pos === "GK") {
    systems.push("4-3-3", "4-2-3-1", "3-5-2");
    roles.push("Último homem", "Organizador da defesa");
  } else if (pos === "CB") {
    systems.push(s.passAccuracy > 85 ? "3-2-5 / construção por baixo" : "4-4-2 compacto", "5-3-2");
    roles.push(
      p90.tackles + p90.interceptions > 2.5 ? "Zagueiro recuperador" : "Zagueiro construtor",
      s.duelsWonPct > 55 ? "Dominante no jogo aéreo" : "Cobertura lateral"
    );
  } else if (pos === "LB" || pos === "RB") {
    systems.push("4-3-3", "3-5-2", "4-2-3-1");
    roles.push(
      p90.keyPasses > 1.2 ? "Lateral ofensivo" : "Lateral equilibrado",
      p90.dribbles > 1.5 ? "Progressão por condução" : "Cruzamento e sobreposição"
    );
  } else if (pos === "CDM") {
    systems.push("4-2-3-1", "4-3-3 com pivô duplo", "3-4-3");
    roles.push("Destruidor de jogo", p90.keyPasses > 1 ? "Regista de saída" : "Protetor da linha defensiva");
  } else if (pos === "CM") {
    systems.push("4-3-3", "4-1-4-1", "3-4-2-1");
    roles.push(
      p90.assists > 0.15 ? "Meia box-to-box criativo" : "Meia de transição",
      p90.tackles > 2 ? "Recuperação no meio" : "Distribuição de posse"
    );
  } else if (pos === "CAM") {
    systems.push("4-2-3-1", "3-4-2-1", "4-3-3 falso 9");
    roles.push("Enganche entre linhas", p90.keyPasses > 2 ? "Último passe" : "Chegada à área");
  } else if (pos === "LW" || pos === "RW") {
    systems.push("4-3-3", "3-4-3", "4-2-3-1");
    roles.push(
      p90.dribbles > 2 ? "Extremo 1x1" : "Extremo de profundidade",
      p90.assists > p90.goals ? "Criador de largura" : "Finalizador de área"
    );
  } else {
    systems.push("4-3-3", "4-2-3-1", "3-5-2");
    roles.push(
      p90.goals > 0.45 ? "Referência de área" : "Atacante móvel",
      p90.assists > 0.12 ? "Pivot de ligação" : "Finalizador de área"
    );
  }

  const style = derivePlayingStyle(player);
  const narrative = [
    `Perfil ${style.label.toLowerCase()} encaixa em sistemas que valorizam ${style.traits[0]?.toLowerCase() ?? "versatilidade tática"}.`,
    `Com ${s.minutesPlayed.toLocaleString("pt-BR")} min na temporada, o jogador demonstra consistência para assumir ${roles[0]?.toLowerCase() ?? "papel definido"} em ${systems[0] ?? "esquemas flexíveis"}.`,
    player.secondaryPosition
      ? `Versatilidade adicional como ${player.secondaryPosition} amplia opções de rotação.`
      : `Posição principal (${pos}) define o encaixe tático prioritário.`,
  ].join(" ");

  return {
    systems: [...new Set(systems)].slice(0, 3),
    roles: [...new Set(roles)].slice(0, 3),
    narrative,
  };
}

export async function generateScoutingReport(player: Player): Promise<ScoutingReport> {
  // Simulate network / inference latency so the UI can exercise
  // its loading state honestly.
  await new Promise((resolve) => setTimeout(resolve, 900));

  const rating = Number(
    (
      player.currentSeasonStats.rating * 0.6 +
      Math.min(10, (player.currentSeasonStats.goals + player.currentSeasonStats.assists) / 3) * 0.4
    ).toFixed(1)
  );

  const playingStyle = derivePlayingStyle(player);

  return {
    id: `report-${player.id}-${Date.now()}`,
    playerId: player.id,
    summary: buildSummary(player),
    strengths: player.strengths,
    weaknesses: player.weaknesses,
    playingStyle: {
      label: playingStyle.label,
      description: playingStyle.description,
      traits: playingStyle.traits,
    },
    tacticalFit: buildTacticalFit(player),
    recommendation: buildRecommendation(rating, player.age),
    overallRating: rating,
    generatedBy: "mock-ai-v2",
    createdAt: new Date().toISOString(),
  };
}
