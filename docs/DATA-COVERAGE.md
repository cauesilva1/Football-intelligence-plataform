# OmniScout — Data coverage & season depth

> **Generated:** 2026-07-27  
> **Source of truth:** `npm run data:coverage` (live DB, `DATA_SOURCE=db`)  
> **Honesty rule:** trajectory needs **≥2 productive seasons**; we never invent slopes from stubs.

## Snapshot (2026-07-27, pós backfill)

| Sport | Players | 0 productive / stub | 1 productive | ≥2 (trajectory-eligible) |
|-------|--------:|--------------------:|-------------:|-------------------------:|
| Soccer | 3 921 | 1 575 | 1 550 | **796 (20.3%)** |
| Basketball | 2 320 | 1 767 | 110 | **443 (19.1%)** |
| American Football | 9 792 | 8 366 | 1 426 | **0 (0%)** |

NBA dual-season backfill (`data:sync-nba-teste -- --teams=30`) unlocked BB trajectory for ~443 players. EuroLeague boxscore window (`--days=90`): **62/259** with any season stats.

### By league (players)

| Sport | League | Players |
|-------|--------|--------:|
| AF | CFB | 6 854 |
| AF | NFL | 2 938 |
| BB | NCAA | 1 474 |
| BB | NBA | 587 |
| BB | EuroLeague | 259 |
| Soccer | Série A (legacy label) | 3 521 |
| Soccer | Big5 / MLS / etc. | ~400 |

### Teams by competition (selected)

NBA 30 · NCAA Men's Basketball 105 · EuroLeague 20 · NFL 32 · College Football 69 · Big5/MLS/Brasileirão as ingested.

### Productive-season floors (`src/lib/intelligence/data-depth.ts`)

| Sport | Min appearances | Min minutes |
|-------|----------------:|------------:|
| Soccer | 4 | 270 |
| Basketball | 8 | 150 |
| American Football | 4 | 200 (proxy) |

Trajectory compute functions share these floors — UI badges and limitations use `deriveDataDepthSnapshot`.

## Known gaps (honest)

1. **EuroLeague:** Rosters always sync; season stats come from boxscores. In off-season use a wide window (`--days=90`) — Finals typically end in May. After 2026-07-27 backfill: **62/259** players with season-stat rows (playoff window), not full regular season.
2. **Basketball multi-season:** Use `npm run data:sync-nba-teste -- --teams=30` to write **2024-25 + 2025-26** productive lines (stubs for 2026-27 alone do not unlock trajectory).
3. **American Football:** NFL/CFB counts OK; multi-season still mostly single productive line until broader `data:backfill-af-season-stats`.
4. **Soccer:** ~20% trajectory-eligible; many rows still stub or single-season — badges surface this on profile.

## Ops commands

```bash
npm run data:coverage
npm run data:coverage -- --json

# EuroLeague season depth (off-season: widen the window)
npm run data:sync-euroleague -- --days=90

# NBA two completed seasons for trajectory
npm run data:sync-nba-teste -- --teams=30

# AF multi-season (when ESPN season lines available)
npm run data:backfill-af-season-stats -- --league=nfl --limit=200
npm run data:backfill-af-season-stats -- --league=cfb --limit=200
```

## Product surface

- Profile header: amber depth badge when `gapKind !== none` (tooltip = description).
- Intelligence panel: same badge + limitations lines from `dataDepthLimitationLines`.
- CLI: `data:coverage` for ops / demos before pitching trajectory quality.
