# OmniScout — Soccer-first scouting plan

> **Product stance:** multi-sport scouting over time, but **soccer is the reference implementation**. Prove the scout workflow in soccer; Basketball / American Football reuse the same playbook later without expanding them now.

The ideas below remain valid. Staging puts **credibility and scout workflow** before platform sprawl.

---

## Status (local implementation)

Stages **0–7** done in the working tree (not pushed).
- Match-level: race-safe season aggregate; appearances written before season rollup.
- Cron: `/api/cron/soccer` covers **last 2 days** across all ESPN soccer leagues (`CRON_SECRET`, `maxDuration` 300).
- Ops: `npm run data:backfill-big5` for European history; daily cron keeps in-season fresh.
Shortlist stays device-local (Stage 2.4 / auth deferred).

**Soccer-first ≠ one shared dashboard.** Each sport keeps its own Overview (cookie). Soccer-first means soccer is the mature reference workflow; BB/AF dashboards stay sport-specific and are not expanded first.

---

## North star (scout day)

```
Discover → Filter → Shortlist → Compare → Report
```

| Surface today | Intended role (soccer) |
|---------------|------------------------|
| **Scouting** | Intelligence — high-signal filters, ratings, opportunities |
| **Players** | Browse / directory — roster-style lookup |
| **Rankings** | Curated shortlists (U23, finishers, hidden gems) |
| **My Players** | Working shortlist + notes |
| **Compare** | Head-to-head decision support |
| **Reports** | Staff-facing brief |
| **Tournaments / Matches** | Context for a player — not the main product |

---

## Stage 0 — Honesty & focus (1–2 days)

**Goal:** demo narrative matches the code; soccer is clearly primary.

| # | Work | Type |
|---|------|------|
| 0.1 | Update `ROADMAP.md`: URL filters + shortlist already partial; mark BB/AF as secondary | Docs |
| 0.2 | Copy: soccer-first on dashboard / rankings hub (“reference sport”) | UX |
| 0.3 | Delete or consolidate dead `src/lib/comparison-analysis.ts` re-export | Refactor |
| 0.4 | UI leftover: e.g. “Rankings curados” → English | Polish |

**Done when:** a visitor understands this is a **soccer scouting prototype** with other sports available, and the ROADMAP doesn’t claim missing features that already exist.

---

## Stage 1 — Trust the numbers (3–5 days)

**Goal:** no more “9.5 rating / 3 minutes / 0 goals” credibility breaks.

| # | Work | Type | Notes |
|---|------|------|-------|
| 1.1 | **Unify soccer rating** into one source of truth | Refactor | Collapse `computeRatingProxy`, `estimateSoccerSeasonRating`, `reliableSoccerRating`, report overall into one module + `/methodology` |
| 1.2 | **Minutes / small-sample** on list + ranking tables | Scout UX | Badge or Minutes column; hide or dash per-90 when &lt; 450′ |
| 1.3 | Align dashboard Top Prospects / Market Opportunities with ranking pipeline | Scout UX | Already mostly aligned — verify + bust cache keys if needed |
| 1.4 | Keep scoring tests green (`npm test`) when touching formulas | Quality | Extend coverage as formulas merge |

**Done when:** U23 / Hidden Gems / profile / lists all show the same rating rules and sample transparency.

---

## Stage 2 — Scout workflow (1–2 weeks)

**Goal:** shortlist and notes feel like tools, not browser toys.

| # | Work | Type | Notes |
|---|------|------|-------|
| 2.1 | Explicit UX split: **Scouting** = intelligence defaults; **Players** = browse defaults | Scout UX | Same list module + route presets (see 3.2) |
| 2.2 | Shortlist UI: “Saved on this device” + tags `priority` / `watch` / `reject` | Scout UX | Still localStorage OK for portfolio; honest copy |
| 2.3 | Notes tied to shortlist item (tag + note on player) | Scout UX | localStorage schema bump |
| 2.4 | Optional later: persist shortlist/notes in DB + auth | Platform | Only after soccer workflow feels right |

**Done when:** a scout can mark 5 players, tag them, write a note, and reopen without confusion about where data lives.

---

## Stage 3 — Role-aware evaluation (1–2 weeks)

**Goal:** ST and CB don’t share the same “pack” of metrics.

| # | Work | Type | Notes |
|---|------|------|-------|
| 3.1 | Position scorecards on player profile (attack / mid / defense / GK packs) | Scout UX | Soccer only |
| 3.2 | Rankings or filters that surface role metrics (e.g. finishers vs defensive actions) | Scout UX | Build on existing presets |
| 3.3 | Similar players weighted by position group (already partial — tighten) | Scout UX | |

**Done when:** opening a CB vs an ST changes the highlighted metrics and language.

---

## Stage 4 — Staff communication (3–5 days)

**Goal:** something you can send to a coach / recruitment lead.

| # | Work | Type | Notes |
|---|------|------|-------|
| 4.1 | One-page **PDF** scout brief: strengths, risks, recommendation, key rates | Scout UX | Replace or complement `.txt` export |
| 4.2 | Report uses **same** rating + sample rules as profile | Refactor | No parallel AI-only score |
| 4.3 | Link report ↔ shortlist player (even if local only) | Scout UX | |

**Done when:** export looks like a briefing, not a dump of text.

---

## Stage 5 — Context, not competition hubs (ongoing, light)

**Goal:** tournaments/matches support the player story.

| # | Work | Type | Notes |
|---|------|------|-------|
| 5.1 | On player profile: recent matches / competition context (soccer) | Scout UX | Prefer deep links over living in Tournaments |
| 5.2 | Do **not** expand NBA/NFL/NCAA hubs until soccer stages 1–4 land | Focus | Keep existing hubs stable |
| 5.3 | World Cup / leagues: maintain as archive + context (DB seed already done) | Ops | |

**Done when:** tournaments are “click for context”, not the demo’s first stop.

---

## Stage 6 — Match-level player stats ✅

**Goal:** every synced boxscore becomes a **player × match** row — not only a season total. Enables “recent appearances” and Sofascore-*inspired* match ratings.

| # | Work | Type | Notes |
|---|------|------|-------|
| 6.1 | `PlayerMatchStat` table (playerId + externalEventKey unique) | Schema | Minutes, G/A, tackles, ints, passes, optional matchId |
| 6.2 | Upsert on **all ESPN soccer leagues** boxscore sync (`processMatchBoxScore`) | Sync | BR, PL, La Liga, Serie A, Bundesliga, Ligue 1, UCL, MLS, WC — not Brasileirão-only |
| 6.3 | Lazy persist when opening finished match detail (known players only) | Sync | Fills gaps without waiting for cron |
| 6.4 | Profile: **Recent appearances** list + match rating | Scout UX | Deep link to `/matches/…` |
| 6.5 | Document match rating in `/methodology` + `SCORING.md` | Docs | Baseline ~6.5; our weights — not Opta/Sofascore |
| 6.6 | Multi-day backfill CLI | Ops | `npm run data:backfill-boxscores -- --days=21 --slug=ger.1` |

**Done when:** finished ESPN games across configured leagues write `PlayerMatchStat` rows; profile shows appearances when that player was in the boxscore.

**Why empty “Recent appearances”?** Season ETL can fill totals without ever writing match rows. Until cron/backfill/lazy match open runs for that league, the panel correctly says there are no lines yet.

**Coverage note:** players only appear if (a) they already exist in DB and match by name, or (b) sync is allowed to create them. Opening a match page also lazy-persists **known** players from any league slug.

---

## Stage 7 — Coverage honesty & scout polish ✅

**Goal:** empty states tell the truth; compare/shortlist glue; no “looks broken” when data is merely unsynced.

| # | Work | Type | Notes |
|---|------|------|-------|
| 7.1 | Honest empty states — **hide** appearances/fixtures panels when empty (no ops copy in UI) | Scout UX | Sync hints stay in docs / CLI only |
| 7.2 | Backfill / cron documented in plan + ROADMAP | Docs | Operators know how to fill Big-5; `--end` for off-season |
| 7.3 | Compare: surface small-sample + role pack side-by-side | Scout UX | Carry Stage 1–3 rules into Compare |
| 7.4 | Report ↔ shortlist: workflow nav + Generate brief + note/tag on brief | Scout UX | Still localStorage OK |
| 7.5 | Patch `Competition.espnSlug` for PL / Serie A / Ligue 1 | Ops | `patch-soccer-competition-slugs.ts` |

**Done when:** a scout can run Discover → Shortlist (tag/note) → Compare → Report without leaving the trail; empty match panels stay silent.

---

## Refactor track (parallel, low risk)

Do these when touching related files — don’t block scout UX.

| Area | Problem | Direction | Stage |
|------|---------|-----------|-------|
| **Rating** | 3–4 formulas | One module + methodology | **1** (required) |
| **Players vs Scouting** | Near-duplicate pages | One listing module + route presets | **2** |
| **Hubs multi-sport** | 3 parallel stacks | Isolate; don’t expand; soccer-first pitch | **5** / freeze |
| **Repos Prisma** | `player.repository.prisma.ts` ~900 lines | Split list/query vs sync/upsert | Anytime after Stage 1 |
| **ROADMAP** | Claims missing URL filters / shortlist | Update to match reality | **0** |
| **`comparison-analysis.ts`** | Dead re-export | Delete or consolidate | **0** |
| **Mock hot path** | Mock teams in client filters | Guard behind `DATA_SOURCE=mock` | When touching filters |
| **Auth / roles** | Partial `(auth)` unused in nav | Defer until shortlist needs accounts | After Stage 2 |

---

## Explicitly out of scope (for now)

- Expanding Basketball / AF leagues, boxscore depth, NCAA
- Multi-tenant / org isolation
- Video scouting, predictive models, public API
- Full PDF design system polish beyond a usable 1-pager
- Vercel Analytics already shipped — no further analytics work needed

---

## Suggested order of execution

```
Stage 0–7 (done locally)
    → Ops backfill Big-5 when demoing European profiles
    → Stage 2.4 auth/shortlist sync only if needed later
```

Refactor items ride along with the stage that touches the same code.

---

## Success criteria (soccer “good enough” to clone the playbook)

1. Ratings and minutes are consistent across dashboard, rankings, profile, report.  
2. Shortlist + notes feel intentional (tags + device disclaimer).  
3. Position changes what you see on the profile.  
4. A one-page brief can be exported and understood by someone outside the app.  
5. Pitch sentence is true: *“Soccer scouting is the reference; other sports follow the same workflow.”*

When those five hold, start Basketball with the **same** stages 1–4 (sport-specific metrics only).
