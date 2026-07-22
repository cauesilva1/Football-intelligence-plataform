# Basketball scout parity (vs soccer reference)

Branch: `feat/basketball-scout-parity`

Product basketball leagues: **NBA**, **NCAA**, **EuroLeague** only.

## Playbook mapped

| Soccer stage | Basketball status |
|--------------|-------------------|
| 1 Rating + sample | ✅ `basketball-rating.ts` (≥10 G / 200′) |
| 2 Workflow shell | ✅ shared shortlist / compare / report |
| 3 Role scorecards | ✅ Guard / Wing / Big (+ Compare packs) |
| 4 Report / PDF | ✅ BB mock + LLM prompt + PDF key rates |
| 6 Match-level | ✅ Native `PlayerMatchStat` PTS/REB/AST/STL/BLK (+ FG); dual-write keeps legacy hijack |
| 7 Honesty polish | ✅ dashboard / rankings sample floors |
| Style / similar | ✅ BB radar axes + Guard/Wing/Big similarity weights + strengths |
| Ops backfill | ✅ `npm run data:backfill-boxscores-basquete -- --days=N` (NBA + NCAA) |
| Daily cron | ✅ last 2 days ESPN NBA/NCAA + EuroLeague official API (`maxDuration` 300) |
| EuroLeague | ✅ `npm run data:sync-euroleague` (clubs, rosters, boxscores) |

## Native match columns

`PlayerMatchStat` stores basketball lines on nullable fields: `points`, `rebounds`, `steals`, `blocks`, `fieldGoalsMade`, `fieldGoalsAttempted`. Readers prefer native with hijack fallback. One-shot migrate:

```bash
npm run data:migrate-bb-match-native
# or apply prisma/sql/player-match-stat-basketball-native.sql
```

Legacy hijack (`goals→PTS`, …) remains as dual-write only and is removable once all rows are migrated.

## Ops

```bash
# Season-style ESPN backfill (default NBA + NCAA)
npm run data:backfill-boxscores-basquete -- --days=14
npm run data:backfill-boxscores-basquete -- --days=7 --league=nba
npm run data:backfill-boxscores-basquete -- --days=7 --league=ncaa

# EuroLeague bootstrap + recent boxscores
npm run data:sync-euroleague -- --days=30

# Daily cron (same window idea as soccer)
npm run data:cron-basquete
```
