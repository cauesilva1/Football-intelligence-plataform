# Data providers

Ingestion talks to a `DataProvider` (`src/lib/providers/types.ts`). The ESPN HTTP, play parsing, and event-key rules live in `src/lib/providers/espn/espn-provider.ts`. Adding a paid source means a new adapter plus one env var per league. The daily cap (10 games, 20s budget, `selectShotBackfillBatch`) stays in the soccer and basketball runners and calls the interface.

Unset env vars resolve to `espn`. An unknown id throws. It does not fall through to ESPN.

| League | Env var |
| --- | --- |
| MLS (`usa.1`) | `SOCCER_MLS_PROVIDER` |
| Premier League | `SOCCER_PREMIER_LEAGUE_PROVIDER` |
| La Liga | `SOCCER_LA_LIGA_PROVIDER` |
| Serie A | `SOCCER_SERIE_A_PROVIDER` |
| Bundesliga | `SOCCER_BUNDESLIGA_PROVIDER` |
| Ligue 1 | `SOCCER_LIGUE_1_PROVIDER` |
| Brasileirão | `SOCCER_BRASILEIRAO_PROVIDER` |
| Champions League | `SOCCER_CHAMPIONS_LEAGUE_PROVIDER` |
| World Cup | `SOCCER_WORLD_CUP_PROVIDER` |
| Copa do Brasil | `SOCCER_COPA_DO_BRASIL_PROVIDER` |
| Libertadores | `SOCCER_LIBERTADORES_PROVIDER` |
| Sudamericana | `SOCCER_SUDAMERICANA_PROVIDER` |
| NBA | `BASKETBALL_NBA_PROVIDER` |
| Scout season totals (Big 5 + MLS) | `SOCCER_SCOUT_METRICS_PROVIDER` (default `fbref`; does not replace the shot adapter) |

## What the app stores

| Need | Canonical field | Notes |
| --- | --- | --- |
| Games | `CanonicalGame` | League, event id, kickoff, both clubs |
| Shots with coordinates | `CanonicalShotEvent` | Attack-normalized 0–100 pitch (`x` toward the goal). Basketball uses the half-court on `BasketballShot` |
| Rosters | `CanonicalRosterPlayer` | Name plus optional external id. Matching to our players stays in ingestion |
| Real xG | `SoccerShot.realXg` | Nullable. Empty until a provider that supplies shot-level xG is wired. Estimated xG (`goals × 0.85 + shots on target × 0.1`) is a separate statistic and is not copied here |
| Season scout totals | `ScoutMetric` | One row per player, season, metric, and provider. Blank source cells are not stored as zero |

`SoccerShot` and `BasketballShot` do not require provider-specific columns. `gameId` is `{leagueSlug}:{eventId}`. Match lines today are `{providerId}:{leagueSlug}:{eventId}`.

## Candidates

### FBref — scout season totals

`FBrefProvider` reads Big 5 and MLS season pages (passing, possession, goal and shot creation, defense) and stores only cells that contain a number: progressive passes, progressive carries, SCA, GCA, xA (`xg_assist`), pressures, passes into the final third, and passes into the penalty area. The provider id is `fbref`, one row in `scout_metrics`. Requests wait 4 seconds and a successful page is cached for 7 days.

On 10 October 2026 the live pages included those column headers, and the stat cells for the StatsBomb measures were empty in the HTML. Empty cells are not written. The profile then shows the empty state instead of a zero. A later fetch that includes numbers will fill the table through `npm run data:sync-fbref-scout`.

### ESPN — current, verified

The live adapter. Scoreboards, club rosters, and shot events with coordinates for soccer and the NBA court. No shot-level xG, so `realXg` stays null. This is the path the daily cron already runs.

### Sportmonks — documented, not verified by us

Their public pricing lists a football plan around EUR 48/month that includes expected-goals statistics at team, player, and shot (fixture event) level, plus fixtures and squads. We have not called the API, checked coordinate coverage, or confirmed that the shot payload includes an x/y we can map onto the 0–100 pitch. Treat the xG claim as their documentation, not as something this app has stored.

### StatsBomb (paid), Opta, Sportradar — future

Enterprise contracts. Event data with coordinates and model xG is what those catalogs sell. None of them is integrated. A later adapter would implement `DataProvider` and set the league env vars. No ingestion rewrite.
