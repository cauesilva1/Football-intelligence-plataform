/**
 * Normalize scout label strings stored in DB (legacy PT enrichments → EN UI).
 */
const SCOUT_LABEL_EN: Record<string, string> = {
  "Ameaça Constante no Ataque": "Constant Attacking Threat",
  "Amostra Reduzida na Temporada": "Small Sample Size This Season",
  "Finalização Clínica": "Clinical Finishing",
  "Criação de Chances": "Chance Creation",
  "Criacao de Chances": "Chance Creation",
  "Visão de Jogo": "Vision",
  "Visao de Jogo": "Vision",
  "Duelos Físicos": "Physical Duels",
  "Duelos Fisicos": "Physical Duels",
  "Antecipação Defensiva": "Defensive Anticipation",
  "Antecipacao Defensiva": "Defensive Anticipation",
  "Consistência de Titular": "Starter Consistency",
  "Consistencia de Titular": "Starter Consistency",
  "Produção Ofensiva": "Offensive Output",
  "Producao Ofensiva": "Offensive Output",
  "Contribuição Ofensiva Limitada": "Limited Offensive Contribution",
  "Contribuicao Ofensiva Limitada": "Limited Offensive Contribution",
  "Disciplina em Campo": "On-Pitch Discipline",
  "Risco de Suspensão": "Suspension Risk",
  "Risco de Suspensao": "Suspension Risk",
  "Envolvimento Consistente": "Consistent Involvement",
  "Minutos Limitados": "Limited Minutes Played",
  "Desarme Preciso": "Precise Tackling",
};

export function localizeScoutLabels(labels: string[] | null | undefined): string[] {
  if (!labels?.length) return [];
  return [...new Set(labels.map((label) => SCOUT_LABEL_EN[label] ?? label))];
}
