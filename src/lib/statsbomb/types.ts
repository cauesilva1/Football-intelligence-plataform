export interface StatsBombMatch {
  match_id: number;
  match_date: string;
  kick_off: string;
  home_score: number | null;
  away_score: number | null;
  home_score_regular?: number | null;
  away_score_regular?: number | null;
  home_score_penalties?: number | null;
  away_score_penalties?: number | null;
  match_status?: string;
  match_week?: number;
  home_team: {
    home_team_id: number;
    home_team_name: string;
    home_team_group?: string | null;
  };
  away_team: {
    away_team_id: number;
    away_team_name: string;
    away_team_group?: string | null;
  };
  competition_stage: {
    id: number;
    name: string;
  };
  stadium: {
    id: number;
    name: string;
    country: { id: number; name: string };
  };
  competition: {
    competition_id: number;
    competition_name: string;
    country_name: string;
  };
  season: {
    season_id: number;
    season_name: string;
  };
  metadata?: {
    source?: string;
    espn_event_id?: string | number;
    fetched_at?: string;
    status_detail?: string;
    live_merged_at?: string;
    [key: string]: unknown;
  };
}
