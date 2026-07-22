# Basketball scout parity (vs soccer reference)

Branch: `feat/basketball-scout-parity`

## Playbook mapped

| Soccer stage | Basketball status |
|--------------|-------------------|
| 1 Rating + sample | ✅ `basketball-rating.ts` (≥10 G / 200′) |
| 2 Workflow shell | ✅ shared shortlist / compare / report |
| 3 Role scorecards | ✅ Guard / Wing / Big (+ Compare packs) |
| 4 Report / PDF | ✅ BB mock + LLM prompt + PDF key rates |
| 6 Match-level | ✅ NBA boxscore → `PlayerMatchStat` + appearances UI |
| 7 Honesty polish | ✅ dashboard / rankings sample floors |
| Ops backfill | ✅ `npm run data:backfill-boxscores-basquete -- --days=14` |
| Daily cron | ✅ last 2 days (same idea as soccer) |

## Still intentionally lighter than soccer

- NCAA match-level depth (NBA-first)
- Native BB columns on `PlayerMatchStat` (still documented hijack)
- Stage 8 API-Football defense (soccer-only)

## Ops

```bash
npm run data:backfill-boxscores-basquete -- --days=14
npm run data:cron-basquete
```
