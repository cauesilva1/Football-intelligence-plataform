# OmniScout — Data coverage & season depth

> **Generated:** 2026-07-27  
> **Source of truth:** `npm run data:coverage` (live DB, `DATA_SOURCE=db`)  
> **Honesty rule:** trajectory needs **≥2 productive seasons**; we never invent slopes from stubs.

## Snapshot (2026-07-27, pós backfills reais)

| Sport | Players | 0 productive / stub | 1 productive | ≥2 (trajectory-eligible) |
|-------|--------:|--------------------:|-------------:|-------------------------:|
| Soccer | 3 921 | 1 549 | 1 430 | **942 (24%)** |
| Basketball | 2 320 | 1 758 | 43 | **519 (22.4% overall · 92% among productive)** |
| American Football | 9 792 | 8 237 | 903 | **652 (6.7%)** |

**Coverage principle:** fill real zeros/stubs from feeds — do not chase vanity `%` by shrinking denominators. `amongProductive` is diagnostic only; overall coverage of rostered players is the product goal.

### Startup KPI (meta)
- **Primary:** Soccer Big5 with **≥1 productive season ≥ 90%** (`npm run data:coverage` → bloco “Startup KPI”).
- **Secondary:** climb **≥2 seasons** via API-Football 2024 + ESPN `--seasonYear=2024` prior boxscores.
- Do **not** treat “90% of all AF+NCAA stubs” as the bar — that is not honest or demo-relevant.

**Latest real fills (same day):**
- Soccer Big5 prior year via API-Football season **2024** (`data:backfill-soccer-seasons`) → +146 trajectory-eligible (796→942).
- EuroLeague full-season boxscores in flight (`--all-played`): **186/259** with season rows (was ~62).
- AF NFL 800 + CFB 600 seasons-only batches completed; trajectory % unchanged until more dual productive lines land.

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

1. **EuroLeague:** Rosters always sync; season stats come from boxscores. Use `--all-played` (batch with `--limit=`) for full regular season — not only the playoff window. In progress: ~190/259 with season rows after first full-season batches.
2. **Basketball multi-season:** Use `npm run data:sync-nba-teste -- --teams=30` to write **2024-25 + 2025-26** productive lines (stubs for 2026-27 alone do not unlock trajectory). NCAA history still thin.
3. **American Football:** Dual prior seasons (2024+2025) via optimized one-call ESPN map; ~6.7% trajectory-eligible — keep raising `--limit=` / ensure ESPN returns productive dual lines.
4. **Soccer:** ~24% trajectory-eligible after prior-season API fill. Many Big5 players still carry legacy `league: "Série A"` while clubs are correctly linked — run `npm run data:fix-soccer-leagues` before trusting league splits. Continue `data:backfill-soccer-seasons` when API quota resets.

## Ops commands

```bash
npm run data:coverage
npm run data:coverage -- --json

# EuroLeague full season (all played games; batch with --limit=)
npm run data:sync-euroleague -- --all-played --limit=80
npm run data:sync-euroleague -- --all-played

# Soccer prior season (API-Football ≤2024 free tier) → real second productive year
npm run data:backfill-soccer-seasons -- --teams=30 --season=2024

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
