export type NbaEspnLeagueSlug = "nba" | "nba-summer";

export const NBA_ESPN_LEAGUES = {
  nba: "nba",
  summer: "nba-summer",
} as const;

export interface EspnAthleteContract {
  salary?: number;
  incomingTradeValue?: number;
  outgoingTradeValue?: number;
}

export interface EspnRosterAthlete {
  id: string;
  contract?: EspnAthleteContract;
}

/** Extrai cap hit da temporada corrente a partir do contrato ESPN. */
export function parseCapHitFromAthlete(athlete: EspnRosterAthlete): number {
  const contract = athlete.contract;
  if (!contract) return 0;

  const salary = contract.salary;
  if (typeof salary === "number" && salary > 0) return salary;

  const tradeValue = contract.incomingTradeValue ?? contract.outgoingTradeValue;
  if (typeof tradeValue === "number" && tradeValue > 0) return tradeValue;

  return 0;
}
