# Soccer effectiveness maps

Source of truth for the 2026-10-10 scoping, approved the same day. A later session resumes from the progress log at the bottom. Do not invent xG. Do not draw a shot that has no coordinate.

## Design

Attacking-half pitch on the player profile **Mapa** tab, same tab pattern as the NBA shot chart. The goal is at the top. Every stored point is rotated so the shot attacks toward x = 100.

Six zones, fixed, classified in this order:

1. **Six-yard box** — inside the 6-yard box.
2. **Penalty area** — inside the penalty area and outside the 6-yard box.
3. **Arch** — the penalty arc outside the box (the D).
4. **Left side** — wide of the penalty area, attacker's left after normalization.
5. **Right side** — wide of the penalty area, attacker's right.
6. **Outside the box** — the rest, including central shots beyond the arc and shots from the defensive half.

Pitch math uses a 105 × 68 m field scaled onto ESPN's 0–100 coordinates (x along the length, y across the width). The arc is a circle in meters, so it is an ellipse in the 0–100 space.

Honesty rules, same as basketball:

- No coordinate, or a coordinate outside 0–100, means no row.
- A zone with fewer than 5 attempts stays grey and shows no percentage. The overall line follows the same floor.
- Empty state when the player or team has no tracked shots for that season. No invented positions.
- Coverage line under the total: the map reflects N tracked games; profile totals cover the full season.
- `converted` is only an ESPN goal or shot on target. Woodwork and blocked shots are not converted. Estimated xG is not read and not written.
- Own goals are not the attacker's shot and are skipped.

The team view on the franchise page sums the same `SoccerShot` table. Players are attributed by the team name on that game's match line. There is no second feed.

## Ingestion

`SoccerShot` is the sister of `BasketballShot`: player, game (`{espnSlug}:{eventId}`), play id, x, y, converted, zone, shot type, season. Soccer rows never go in `basketball_shots`.

Source: ESPN core plays (`fieldPositionX/Y`, and `fieldPosition2X` only to see which goal was attacked). The site summary does not carry the point. Only shot event types are fetched in full — a match is about 1,400 plays, almost all passes.

Shot types: `shot-*`, `goal---` / other `goal-*` except `goal-kick`, and `penalty---`. Not saves, not assists, not goal kicks, not blocked passes.

Order: MLS (`usa.1`) first. Toronto FC, Vancouver Whitecaps, and CF Montréal are in that feed. Then the other ESPN leagues already on the soccer cron, in competition-config order. Ten games per run, oldest stored game first inside a league, shared cap. A game that returns no usable coordinates is cached so the queue moves on; one league without coordinates does not freeze MLS.

The daily soccer cron calls this after boxscores, with whatever time is left inside the 300s limit.

## Progress

- [x] Phase 1 — Ingestion (`SoccerShot`, ESPN shot plays, MLS then the other cron leagues, cap 10). Shooters match the game's roster by name, because soccer `apiSportsId` is API-Football, not the ESPN athlete id. Coordinates at or below 1 on both axes are 0–1 fractions and are scaled to 0–100. A game with shots but no roster match is left uncached so the next run can retry it. First run, 2026-10-10: 10 MLS games, 68 shots stored (192 shot events had no roster-name match and were not invented). Inter Miami CF has 27 of those shots across 2 games.
- [x] Phase 2 — Player map (zone query, attacking-half SVG, Mapa tab, empty state, coverage line).
- [x] Phase 3 — Team map on the franchise page, same table. Players are the ones whose match line for that game names the franchise.
