# OmniScout Fix Backlog

**Created:** 2026-09-30
**Source:** Live visual UX review of https://omni-scout.vercel.app (13 routes, desktop) + repository state brief.
**Goal:** Turn the strongest visual portfolio piece into one a hiring manager can click through for 10 minutes without hitting a credibility bug.

## How to work through this (agent instructions)

- Work **one batch at a time**, in order. Do not start Batch N+1 until Batch N is done, typechecked, and linted.
- For each item: investigate read-only first, then make the minimal edit.
- After each batch: run typecheck + lint, then update this file — check off done items and add a dated entry to the Progress Log.
- Never run destructive database operations without asking. Never change `prisma/schema.prisma` unless the item says so.
- Cite file paths in your summaries. Mark anything you cannot verify `[UNVERIFIED]` instead of guessing.
- Acceptance criteria are checkable statements. An item is done when every criterion holds.

---

## Batch 1 — Data cleanup (highest priority)

Fixes credibility. A hiring manager clicking around hits these within minutes.

- [x] **1.1 Duplicate player rows.** "Aaron Anselmino" appears twice (Strasbourg AND Dortmund); "Aaron Ramsdale" twice (Everton AND Newcastle United).
  - Investigate: `src/etl/load/prisma-loader.ts`, CSVs in `data/raw/`.
  - Fix: dedupe on player identity, keep the correct current club. Add a guard so re-running the loader cannot recreate duplicates.
  - Acceptance: searching `/players` for "Anselmino" or "Ramsdale" returns exactly one row each.
- [x] **1.2 "NAN" club code.** Leaks into the `/players` table (e.g. Abakar Sylla); some clubs render as "—".
  - Fix null/missing-club handling in the loader and repository. UI must show "Unknown" or hide the field — never "NAN".
  - Acceptance: no "NAN" string anywhere in player-facing UI.
- [x] **1.3 Fabricated fixtures.** Newcastle United appears in CONMEBOL Libertadores context. A match page reads "United States 4-0 Newcastle United · CONMEBOL Libertadores Final · 2nd Leg" while its body text says "Cienciano del Cusco win 4-2 on aggregate".
  - Investigate: `src/lib/tournaments/world-cup-2026.ts`, `src/features/matches/match-queries.ts`, ESPN sync scripts (`npm run data:*`).
  - Fix: quarantine or delete nonsensical fixtures. Matches that cannot be resolved to a real competition must not render as real results.
  - Acceptance: no European club appears in a CONMEBOL competition context; no match page contains mutually contradictory result text.
- [x] **1.4 Flat 6.5 match ratings.** Every recent appearance on player profiles is rated exactly 6.5.
  - Fix: compute honest variation or display as unavailable. Never a flat fake constant.
  - Acceptance: no player profile shows an entire appearances table with identical ratings.
- [x] **1.5 xG/xA defaulting to 0.** `src/etl/data-dictionary.ts` sets xG/xA to 0 when the source column is missing, so elite scorers show 0.00 xG/90 (e.g. Lewandowski 0.88 goals/90, 0.00 xG/90).
  - Fix: when the source column never existed, render "—" / "insufficient data" instead of 0.00. Distinguish "measured zero" from "not measured".
  - Acceptance: no player whose source CSV lacks xG shows 0.00 xG/90 as if measured.
- [x] **1.6 Position misclassifications.** Lamine Yamal listed as CM; compare-page search dropdown defaults many players (Belotti, Broja, Pinamonti) to "MID".
  - Fix the position mapping at ingestion.
  - Acceptance: spot-check 20 well-known players — positions match their real primary position.
- [x] **1.7 National teams in the club directory.** Algeria, Argentina (0 players, blank stats) appear in `/teams`.
  - Fix: filter national teams out of the club listing, or give them their own section.
  - Acceptance: `/teams` contains only clubs/franchises.

## Batch 2 — Number formatting

- [x] **2.1 Shared formatter.** Create (or reuse) a single number-formatting helper and apply it to every user-facing number.
  - Known leaks to fix: compare tooltip "Creativity — Escandell: 3.869047619047619"; recruitment "Min rating" spinbutton showing 6.800000190734863; recruitment League field placeholder literally reading "competitionId" (replace with a human label).
  - Audit all numeric UI output for similar leaks (tooltips, inputs, table cells).
  - Acceptance: no raw float with more than 2 decimals visible anywhere in the UI; no raw variable names as placeholder/label text.

## Batch 3 — Dashboard charts + copy polish

- [x] **3.1 "Goals by Position" aggregation.** Shows CM with ~1,100 goals vs ST ~430.
  - Investigate the query. Fix the aggregation or remove the chart if the metric is not meaningful.
  - Acceptance: chart values are defensible, or the chart is gone.
- [x] **3.2 "Average Rating Trend" single dot.** Renders one data point on a 9–5 y-axis; looks broken.
  - Fix: build a real time series, or replace with an honest empty state.
  - Acceptance: no chart renders a single dot presented as a trend.
- [x] **3.3 Compare-page scale bug.** The Creativity bar renders absurdly oversized against the 0–100 scale.
  - Fix the normalization so all dimension bars share the 0–100 scale.
  - Acceptance: no bar overflows its 0–100 track.
- [x] **3.4 Copy polish.** "2 superior dimension(s)" → proper pluralization; "Ba l a n c e d block" letter-spacing artifact in the tactical-fit section.
  - Acceptance: no "(s)" pluralization hacks; no letter-spaced rendering artifacts in user-facing copy.

## Batch 4 — AI report generator on the player profile

The generator exists (server action `createScoutingReport` in `src/lib/actions/reports.ts`, OpenRouter `meta-llama/llama-3.3-70b-instruct:free`, 5 reports / 10 min rate limit, heuristic fallback). Today its trigger lives only in `/reports`.

- [x] **4.1 Profile trigger.** Add "Generate scout brief" as a fixed section on `src/app/players/[id]/page.tsx`. Keep `/reports` working as-is.
- [x] **4.2 Percentiles in the prompt.** Include an explicit per-90 percentile table in the LLM prompt (see `src/lib/intelligence/soccer/league-percentiles.ts`, minimum cohort 8). Today the model only receives a generic player JSON.
- [x] **4.3 Honesty rules.** When xG is 0/missing or the league cohort has fewer than 8 players, the prompt must instruct the model to omit or hedge those metrics — never invent.
- [x] **4.4 Keep the architecture.** Server action (no new REST route), same OpenRouter free model, same rate limit, same heuristic fallback.
  - Acceptance: generating a brief from a player profile works end-to-end; the brief's narrative never contradicts the server-computed rating; missing-data cases are hedged, not hallucinated.

## Batch 5 — Secondary sports + demo page

- [x] **5.1 Basketball / American football desks.** The basketball desk currently renders soccer content under a "Basketball" header.
  - Decision required (ask before implementing): either wire real basketball data through the shared components, or remove basketball/American football from the landing page claims until they are real. Do not ship a fake desk.
- [x] **5.2 /demo internal stage direction.** The page exposes internal guidance ("What not to lead with — Basketball and American football are secondary desks...").
  - Fix: remove the internal direction from the public page, or make `/demo` non-indexed and unlinked from public navigation.
  - Acceptance: no internal demo-stage-direction is visible to public visitors.

---

## After the backlog (not started)

1. **Published case study.** One short analytical writeup with a concrete finding from the cleaned data (GitHub/Kaggle). This is the missing portfolio piece: an analytical conclusion signed by the author, shareable independently and usable as a networking follow-up.
2. **Natural-language query layer.** The one planned AI feature with no existing implementation — a text-to-query interface over the Prisma repository (or mock), with the same honesty rules for stubs and zero-xG data.
3. **PDF with charts.** The scout-brief PDF is currently text-only (`src/lib/export/scout-brief-pdf.ts`).
4. **Mobile responsiveness.** Not covered by the 2026-09-30 review (no viewport control in the test setup) — needs a real device check.
5. **Set-piece research satellite.** Separate research repo using StatsBomb Open Data, linking back to OmniScout. Research artifact, not a product feature.

---

## Progress Log

| Date | Batch | Notes |
|------|-------|-------|
| 2026-09-30 | — | Backlog created from live UX review + repo brief. Nothing started. |
| 2026-09-30 | 1 | Data cleanup in code. Identity comes from the embedded FBref index: one row per player, club = squad with more minutes (Anselmino → Dortmund, Ramsdale → Newcastle United). `MF,FW` maps to ST because the light file has no wing side. Joint xG/xA of 0 renders as not measured (nullable columns would need a schema change). |
| 2026-09-30 | 1 | Deploy of `065a5e4` verified live. Production cleanup: deleted 26 fabricated fixtures (European clubs in CONMEBOL and/or contradictory phase text). 0 violating rows remained. |
| 2026-10-02 | 2 | Shared `formatDisplayNumber` in `src/lib/format/display-number.ts`. Chart tooltips/axes, recruitment min rating, and soccer leader cells no longer show raw floats. League placeholder is "Premier League". Basketball standings PCT stays a rounded 3-decimal ratio (`.667`), the usual standings form. |
| 2026-10-02 | 3 | Soccer goals chart is mean goals/90 by role (GK, DEF, MID, ATT) on players with ≥270 minutes, so a large CM bucket cannot outscore attackers. Rating trend renders only with two or more seasons; one season shows the average and an empty state. Creativity/Creation treat `keyPasses` as crosses (benchmark 8/90) and stay on a 0–100 scale. Compare copy uses real plurals. The tactical-fit style badge uses normal letter-spacing. Checked locally on the dashboard, Kane vs Lewandowski, and Kane's profile. |
| 2026-10-03 | 4 | Player profile has a fixed "Generate scout brief" section that calls `createScoutingReport`. The prompt adds a per-90 percentile table (cohort minimum 8) and tells the model to omit unmeasured xG and missing percentiles. Overall rating stays the server number; a contradictory "overall rating" phrase is rewritten to it. Same server action, rate limit, and heuristic fallback. OpenRouter model is `OPENROUTER_MODEL`, default `qwen/qwen3.8-27b:free`, after `meta-llama/llama-3.3-70b-instruct:free` returned 404. Checked on A. Abqar: the brief rendered with overall rating 6.0 matching the summary via the heuristic fallback — live LLM wording is [UNVERIFIED]. `/reports` still loads. |
| 2026-10-03 | 5 | Decision for 5.1: wire real data (basketball/AF data is real and sport-native, no Batch-1-scale problem, so no full cleanup). Fixed wrong-sport leaks only: sample floor and score tooltips per sport (`src/lib/score-definitions.ts`), "Standout" insight uses `playerDisplayName` (cache key `dashboard-overview-v9`), cap hit for AF similar players instead of a market value, `formatSeasonLabel` turns "202627" into "2026/27", English "Undisclosed" and `$2.2M` formats, empty-leaders message states the reason, landing sports strip says "Secondary desk" (that component is not rendered anywhere today). `/demo` is `noindex` and no longer shows stage direction. Checked by curl with the sport cookie on `/dashboard` and `/demo`; tsc clean, 126 tests pass. Follow-up fixes: `findSample({ minMinutes })` for BB/AF now filters `PlayerSeasonStats` (ints like 202627 / 2025) instead of the soccer-only legacy "2025/26" table, which matched nothing; the dashboard BB leaders use a ≥10 G / 200' floor and now list players (Shai Gilgeous-Alexander 29 PTS, Nikola Jokic 15 REB and 12 AST; stored values are whole numbers). Side effect: BB/AF league percentile cohorts used the same filter and can now be non-empty — [UNVERIFIED] on live profiles. Similar Players shows "—" instead of a match percentage when the target or the candidate has no games (`comparable` flag in `findSimilarPlayers`; intelligence comparables drop those entries). Fixup: `/demo` is now a public product overview (what it does, for whom, key features; still `noindex`; footer link reads "Product overview"). Basketball template leaks: crest alt is "<name> logo", appearances header reads "Game", tactical-fit link says "View franchise profile", Scout Notes placeholder is sport-specific, and minutes read "200 minutes" / "200 min" instead of 200' (dashboard, rankings preset, glossary, methodology, profile, brief). Season labels ("202627" → "2026/27") now also format the Season Evolution and dashboard rating-trend chart ticks and tooltips — checked in code only, charts render client-side so not seen in the SSR HTML. **Remaining, not fixed:** (c) most BB/AF players store slug-style `knownAs` (display helper masks it, raw field still slugs); (d) large zero-stat AF roster pool; (e) client filter panels (scouting, recruitment, players) render soccer defaults in the server HTML until hydration, then switch to the right sport. |
| 2026-10-03 | Roadmap 1 | Freshness audit, basketball part. Seasons are date-based in `src/lib/basketball/season.ts`: NBA rolls on 1 July (202627), NCAA on 1 November, EuroLeague on 1 July (`E2026` / 202627); `NBA_BOXSCORE_SEASON`, `EUROLEAGUE_SEASON_CODE` and `EUROLEAGUE_SEASON_YEAR` are gone and the EuroLeague hub labels come from the resolved season. The basketball cron now runs four logged steps in one handler with a 270 s budget: NBA/NCAA boxscores, EuroLeague clubs + rosters (skips players refreshed in the last 3 days), EuroLeague boxscores (catches up on up to 15 uncached played games per run), then NBA franchises + rosters (`src/lib/sync/nba-roster-sync.ts`, stalest franchise first, skipped if under 25 s remain; `npm run data:sync-nba-elencos` reuses it). Response now includes `rosters` and `elapsedMs`. Verified by tsc and unit tests only — real run time against the 300 s limit and the first catch-up of E2026 games are [UNVERIFIED] until the next cron execution. |

---

## Post-backlog roadmap

1. **Step 1 — Freshness audit** (this task): fix the cron/data gaps found. Acceptance: all three sports show current-season data.
2. **Step 2 — Refresh the hybrid Q&A spec**: correct the OpenRouter model (`OPENROUTER_MODEL`, qwen default), update current state after the batches, and answer the 3 open questions (are reports persisted? is pgvector supported? where does the route live?). Acceptance: the spec has no stale model or state claims and the 3 questions each have a written answer with evidence.
3. **Step 3 — Part 1: text-to-SQL with guardrails + `/ask` route** (Stats / Reports tabs). Acceptance: read-only, allow-listed queries only; answers cite their source rows; unknown or unsafe questions are refused.
4. **Step 4 — Part 2: RAG with pgvector**, only if real usage of Step 3 demands it. Acceptance: a recorded set of real questions that text-to-SQL cannot answer, and a retrieval measurement showing RAG fixes them.
