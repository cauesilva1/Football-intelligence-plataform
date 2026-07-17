/** Static NFL division map — ESPN standings often flatten to AFC/NFC only. */
export const NFL_DIVISION_BY_ABBR: Record<string, string> = {
  BUF: "AFC East",
  MIA: "AFC East",
  NE: "AFC East",
  NYJ: "AFC East",
  BAL: "AFC North",
  CIN: "AFC North",
  CLE: "AFC North",
  PIT: "AFC North",
  HOU: "AFC South",
  IND: "AFC South",
  JAX: "AFC South",
  TEN: "AFC South",
  DEN: "AFC West",
  KC: "AFC West",
  LV: "AFC West",
  LAC: "AFC West",
  DAL: "NFC East",
  NYG: "NFC East",
  PHI: "NFC East",
  WSH: "NFC East",
  CHI: "NFC North",
  DET: "NFC North",
  GB: "NFC North",
  MIN: "NFC North",
  ATL: "NFC South",
  CAR: "NFC South",
  NO: "NFC South",
  TB: "NFC South",
  ARI: "NFC West",
  LAR: "NFC West",
  SF: "NFC West",
  SEA: "NFC West",
};

export function nflDivisionLabel(abbreviation?: string, fallbackConference?: string): string {
  if (abbreviation && NFL_DIVISION_BY_ABBR[abbreviation.toUpperCase()]) {
    return NFL_DIVISION_BY_ABBR[abbreviation.toUpperCase()];
  }
  return fallbackConference?.trim() || "NFL";
}
