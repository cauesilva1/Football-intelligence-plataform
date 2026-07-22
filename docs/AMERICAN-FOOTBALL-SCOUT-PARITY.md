# American Football scout parity (vs soccer / basketball)

Branch work: AF soccer-depth parity (NFL + CFB only).

## Playbook mapped

| Soccer / BB stage | American Football status |
|-------------------|--------------------------|
| 1 Rating + sample | ✅ `football-rating.ts` (≥6 G / 360′ proxy) |
| 2 Workflow shell | ✅ shared shortlist / compare / report |
| 3 Role scorecards | ✅ QB / Skill / Defense / OL / Specialist |
| 6 Match-level | ✅ Native `PlayerMatchStat` yards/TD/sacks (+ season dual-write) |
| Style / similar | ✅ AF radar axes + position-group weights + strengths |
| Ops backfill | ✅ `npm run data:backfill-boxscores-af -- --days=N` |
| Daily cron | ✅ last 2 days NFL + CFB (`maxDuration` 300) |
| Appearances UI | ✅ Recent appearances on AF profiles |

## Product leagues

- **NFL** — reference
- **College Football (CFB)** — elite conferences already bootstrapped

Out of scope: CFL, XFL/UFL, high school.

## Native columns

`PlayerMatchStat` / `PlayerSeasonStats` nullable: `passingYards`, `rushingYards`, `receivingYards`, `touchdowns`, `sacks`, `totalYards`. Readers prefer native with hijack fallback. Dual-write keeps legacy encode (`goals→TD`, `points→yards`, …).

```bash
npm run data:migrate-af-match-native
# or apply prisma/sql/player-match-stat-football-native.sql
```

## Ops

```bash
npm run data:backfill-boxscores-af -- --days=14
npm run data:backfill-boxscores-af -- --days=7 --league=nfl
npm run data:backfill-boxscores-af -- --days=7 --league=cfb
npm run data:cron-af
npm run data:sync-af-rosters
```

Vercel: `GET /api/cron/american-football` (requires `CRON_SECRET`).
