export const TACTICAL_FIT_DISCLAIMER =
  "Heuristic squad-style match from season aggregates — not a full tactical model.";

export interface TacticalFitResult {
  teamId: string;
  teamName: string;
  fitScore: number;
  teamStyleLabel: string;
  reasons: string[];
  limitations: string[];
}
