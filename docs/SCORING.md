# Scoring & data methodology (prototype)

This document is the honest reference for OmniScout / Football Intelligence Platform.
It matches the rules in `src/lib/scoring.ts` and `src/lib/metrics/per90.ts`.

> The current version uses a **prototype dataset** and **scoring models that are still being refined**.
> It is a portfolio / interview demo — not a system already used by professional clubs.

---

## What is real vs prototype?

| Layer | Status | Notes |
|-------|--------|--------|
| Soccer player identities & season totals (DB / sync) | **Mixed** | Live ESPN / FBref-style ingest when `DATA_SOURCE=db`; otherwise seeded **mock** generators |
| Goals/90, Assists/90 | **Derived** | `(value / minutes) × 90`, with a **soft cap of 1.8** to stop tiny-sample artefacts (e.g. 1 goal in 11′ → 8.18) |
| Player Rating (soccer, DB seasons) | **Proxy model** | Simple productivity formula — not Opta/Sofascore |
| Market value / Cap Hit | **Prototype / estimate** | Seeded or synced estimates — not Transfermarkt verified |
| Top Prospect / Market Opportunity | **Rule-based labels** | Explicit thresholds below — not ML models |
| Match hubs (NBA / NFL / ESPN) | **Live public feeds** | Subject to ESPN availability and timeouts |
| AI Scout Reports | **LLM-assisted** | OpenRouter; narrative quality depends on the underlying stats |

Default local mode without DB is **`DATA_SOURCE=mock`** (generated demo players).

---

## Player Rating (soccer)

**Where:** `estimateSoccerSeasonRating` in `src/lib/metrics/map-season-stats.ts`

**If minutes ≥ 450:**

\[
\text{rating} = \mathrm{clamp}_{[5,10]}\bigl(6 + g_{90}\cdot 0.35 + a_{90}\cdot 0.25\bigr)
\]

where \(g_{90}\) and \(a_{90}\) are soft-capped at **1.8**.

**If minutes < 450:** conservative baseline from raw goal/assist counts (capped contribution), max rating **7.0** — avoids inflated ratings from 10-minute cameos.

Mock seed ratings are often drawn in a band (~6.1–8.4) and are **not** the same formula.

---

## Top Prospect / Best Performers / Market Opportunity

Short definitions (also on the dashboard):

- **Top Prospects:** U23 players who meet a minimum performance rating (and a reliable minutes sample in soccer).
- **Best Performers:** Players with the highest overall rating in the current dataset.
- **Market Opportunities:** Players combining strong performance indicators with a lower estimated market value.

### Top Prospect (thresholds)

**Where:** `buildDashboardOverview` → `isTopProspect`

A player counts as a Top Prospect when **all** are true:

1. Age ≤ **23**
2. Rating ≥ **7.0**
3. Soccer only: minutes played ≥ **450** (reliable sample)

Sorted by rating; dashboard shows the top 5.

---

## Market Opportunity

**Where:** `isMarketOpportunity`

Soccer / general:

1. Age ≤ **25**
2. Rating ≥ **7.2**
3. Market value ≤ **€8,000,000**
4. Soccer: minutes ≥ **450**

American Football: Cap Hit ≤ **$5,000,000** (instead of market value), same age/rating idea.

Sorted by rating ÷ value (or rating ÷ cap hit). This is a **screening heuristic**, not a valuation model.

---

## Goals/90 & Assists/90 guards

| Rule | Value | Purpose |
|------|-------|---------|
| Soft cap | **1.8** | Hide impossible rates from bad minute estimates |
| Leaderboard filter | **≥ 450 minutes** | Align dashboard “top scorers” with scouting practice |
| ESPN minute fallback | **15′** (was 1′) | Boxscore players without sub clocks no longer get 1 minute |

Re-sync may still leave old rows in the DB until the next ESPN/season sync.

---

## How to talk about this in an interview

Suggested line:

> “The product surface is multi-sport scouting UX with live hubs where it helps. Ratings and opportunity flags are transparent prototype heuristics I’m iterating on — I’m explicit about sample-size and soft caps so the numbers stay credible.”

Point people to this file and the in-app prototype banner.
