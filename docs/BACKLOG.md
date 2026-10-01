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

- [ ] **2.1 Shared formatter.** Create (or reuse) a single number-formatting helper and apply it to every user-facing number.
  - Known leaks to fix: compare tooltip "Creativity — Escandell: 3.869047619047619"; recruitment "Min rating" spinbutton showing 6.800000190734863; recruitment League field placeholder literally reading "competitionId" (replace with a human label).
  - Audit all numeric UI output for similar leaks (tooltips, inputs, table cells).
  - Acceptance: no raw float with more than 2 decimals visible anywhere in the UI; no raw variable names as placeholder/label text.

## Batch 3 — Dashboard charts + copy polish

- [ ] **3.1 "Goals by Position" aggregation.** Shows CM with ~1,100 goals vs ST ~430.
  - Investigate the query. Fix the aggregation or remove the chart if the metric is not meaningful.
  - Acceptance: chart values are defensible, or the chart is gone.
- [ ] **3.2 "Average Rating Trend" single dot.** Renders one data point on a 9–5 y-axis; looks broken.
  - Fix: build a real time series, or replace with an honest empty state.
  - Acceptance: no chart renders a single dot presented as a trend.
- [ ] **3.3 Compare-page scale bug.** The Creativity bar renders absurdly oversized against the 0–100 scale.
  - Fix the normalization so all dimension bars share the 0–100 scale.
  - Acceptance: no bar overflows its 0–100 track.
- [ ] **3.4 Copy polish.** "2 superior dimension(s)" → proper pluralization; "Ba l a n c e d block" letter-spacing artifact in the tactical-fit section.
  - Acceptance: no "(s)" pluralization hacks; no letter-spaced rendering artifacts in user-facing copy.

## Batch 4 — AI report generator on the player profile

The generator exists (server action `createScoutingReport` in `src/lib/actions/reports.ts`, OpenRouter `meta-llama/llama-3.3-70b-instruct:free`, 5 reports / 10 min rate limit, heuristic fallback). Today its trigger lives only in `/reports`.

- [ ] **4.1 Profile trigger.** Add "Generate scout brief" as a fixed section on `src/app/players/[id]/page.tsx`. Keep `/reports` working as-is.
- [ ] **4.2 Percentiles in the prompt.** Include an explicit per-90 percentile table in the LLM prompt (see `src/lib/intelligence/soccer/league-percentiles.ts`, minimum cohort 8). Today the model only receives a generic player JSON.
- [ ] **4.3 Honesty rules.** When xG is 0/missing or the league cohort has fewer than 8 players, the prompt must instruct the model to omit or hedge those metrics — never invent.
- [ ] **4.4 Keep the architecture.** Server action (no new REST route), same OpenRouter free model, same rate limit, same heuristic fallback.
  - Acceptance: generating a brief from a player profile works end-to-end; the brief's narrative never contradicts the server-computed rating; missing-data cases are hedged, not hallucinated.

## Batch 5 — Secondary sports + demo page

- [ ] **5.1 Basketball / American football desks.** The basketball desk currently renders soccer content under a "Basketball" header.
  - Decision required (ask before implementing): either wire real basketball data through the shared components, or remove basketball/American football from the landing page claims until they are real. Do not ship a fake desk.
- [ ] **5.2 /demo internal stage direction.** The page exposes internal guidance ("What not to lead with — Basketball and American football are secondary desks...").
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
| 2026-09-30 | 1 | Data cleanup in code. No database deletes. Live site [UNVERIFIED] until this build is deployed. Identity comes from `data/raw/players_data_light-2025_2026.csv`: one row per player, club = squad with more minutes (Anselmino → Dortmund, Ramsdale → Newcastle United). `MF,FW` maps to ST because the light file has no wing side. Joint xG/xA of 0 renders as not measured (nullable columns would need a schema change). |
