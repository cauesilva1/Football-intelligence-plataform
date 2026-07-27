export type AmericanFootballDimensionKey =
  | "passing"
  | "rushing"
  | "receiving"
  | "disruption"
  | "tackling";

export const AMERICAN_FOOTBALL_DIMENSION_KEYS: AmericanFootballDimensionKey[] = [
  "passing",
  "rushing",
  "receiving",
  "disruption",
  "tackling",
];

export const AMERICAN_FOOTBALL_DIMENSION_LABELS: Record<
  AmericanFootballDimensionKey,
  string
> = {
  passing: "Passing",
  rushing: "Rushing",
  receiving: "Receiving",
  disruption: "Disruption",
  tackling: "Tackling",
};
