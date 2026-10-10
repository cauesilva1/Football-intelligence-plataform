import {
  ESPN_COPA_DO_BRASIL_SLUG,
  ESPN_LIBERTADORES_SLUG,
  ESPN_MLS_SLUG,
  ESPN_SUDAMERICANA_SLUG,
  FIFA_WORLD_CUP_SLUG,
} from "@/lib/seasons";
import { espnProvider } from "@/lib/providers/espn/espn-provider";
import type { DataProvider } from "@/lib/providers/types";

/** Used only when the league env var is unset. A typo does not fall through to this. */
export const DEFAULT_PROVIDER_ID = "espn";

const ADAPTERS: Record<string, DataProvider> = {
  espn: espnProvider,
};

/**
 * One env var per league. Ingestion reads the value; it never names an adapter.
 * Documented in docs/data-providers.md.
 */
export const LEAGUE_PROVIDER_ENV: Record<string, string> = {
  [`soccer:${ESPN_MLS_SLUG}`]: "SOCCER_MLS_PROVIDER",
  "soccer:eng.1": "SOCCER_PREMIER_LEAGUE_PROVIDER",
  "soccer:esp.1": "SOCCER_LA_LIGA_PROVIDER",
  "soccer:ita.1": "SOCCER_SERIE_A_PROVIDER",
  "soccer:ger.1": "SOCCER_BUNDESLIGA_PROVIDER",
  "soccer:fra.1": "SOCCER_LIGUE_1_PROVIDER",
  "soccer:bra.1": "SOCCER_BRASILEIRAO_PROVIDER",
  "soccer:uefa.champions": "SOCCER_CHAMPIONS_LEAGUE_PROVIDER",
  [`soccer:${FIFA_WORLD_CUP_SLUG}`]: "SOCCER_WORLD_CUP_PROVIDER",
  [`soccer:${ESPN_COPA_DO_BRASIL_SLUG}`]: "SOCCER_COPA_DO_BRASIL_PROVIDER",
  [`soccer:${ESPN_LIBERTADORES_SLUG}`]: "SOCCER_LIBERTADORES_PROVIDER",
  [`soccer:${ESPN_SUDAMERICANA_SLUG}`]: "SOCCER_SUDAMERICANA_PROVIDER",
  "basketball:nba": "BASKETBALL_NBA_PROVIDER",
};

export function providerEnvName(sport: "soccer" | "basketball", leagueKey: string): string {
  return LEAGUE_PROVIDER_ENV[`${sport}:${leagueKey}`] ?? `${sport.toUpperCase()}_PROVIDER`;
}

export function resolveProviderId(raw: string | undefined): string {
  const id = (raw ?? "").trim().toLowerCase();
  if (!id) return DEFAULT_PROVIDER_ID;
  if (!ADAPTERS[id]) {
    throw new Error(`Unknown data provider "${id}". Registered: ${Object.keys(ADAPTERS).join(", ")}`);
  }
  return id;
}

export function providerFor(sport: "soccer" | "basketball", leagueKey: string): DataProvider {
  const envName = providerEnvName(sport, leagueKey);
  const id = resolveProviderId(process.env[envName]);
  return ADAPTERS[id];
}
