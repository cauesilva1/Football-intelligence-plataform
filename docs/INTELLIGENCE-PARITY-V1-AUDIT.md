# OmniScout — Intelligence Parity v1 · Audit & Architecture Proposal

> **Date:** 2026-07-27  
> **Branch:** `experiments`  
> **Status:** AUDIT ONLY — no implementation in this document’s companion work yet  
> **Spec source:** user brief “Intelligence Parity v1”  
> **Sibling docs:** `PROJECT-STATUS-AND-SPORT-PARITY.md`, `OMNISCOUT-INTELLIGENCE-PLAYBOOK.md`

---

## Verdict (read this first)

**Continue OmniScout. The architecture is strong enough.**  
The brief is directionally correct. The main risk is **scope inflation** (doing BB + AF + tactical fit + full shared OOP engines in one push).

**Recommended first slice (prove the platform):**

1. Shared intelligence **types/contract** (thin)  
2. Dispatcher `getIntelligenceEngine(sport)`  
3. Adapter soccer → shared contract (**no behavior rewrite**)  
4. Basketball intelligence profile + percentiles + trajectory + tests  
5. Open query/UI gates for BB profile only  

Defer AF until BB profile is stable. Defer BB/AF tactical fit. Defer embeddings / LLM narrative / auth / billing.

---

## 1. Current architecture audit

### What exists

| Layer | Location | Maturity |
|-------|----------|----------|
| SportRegistry + cookie | `src/lib/sport-registry.ts`, sport context | Shared ✅ |
| Ratings | `src/lib/scoring/{soccer,basketball,football}-rating.ts` | Shared desk ✅ |
| Scorecards | `src/features/scouting/lib/position-scorecard.ts` | Shared ✅ |
| Similarity | `src/features/scouting/lib/similarity.ts` | Shared scores; **why** only soccer |
| Intelligence | `src/lib/intelligence/soccer/` only | Soccer depth ✅ |
| Workspace 5a | `src/lib/workspace/` | Shared ✅ |
| Landing Phase M | `src/features/marketing/` | Multi-sport peers ✅ |
| Schema | `Player`, `PlayerSeasonStats`, `PlayerMatchStat` multi-sport fields | Enough for BB/AF v1 |

### Architecture pattern today

```
UI / queries
    ↓ (often soccer-hardcoded)
soccer intelligence modules (pure functions)
    ↓
Player domain type + season/match stats
```

This is **good**: headless, testable, no fake ML. Weakness: **no shared contract**, so every consumer imports soccer directly.

### Product classification (Phase 14)

**Today: hybrid — mostly (A)+(B) desk, with a real (C) intelligence core in soccer only.**

| Label | Fit |
|-------|-----|
| A Statistics dashboard | Shared desk still looks like this for BB/AF |
| B Data visualization | Compare, scorecards, charts |
| C Sports intelligence product | Soccer Phases 1–3 |
| D Hybrid | **Current honest label** |

Target remains **C** via sport-specific engines behind one contract.

---

## 2. Existing soccer intelligence architecture (reference)

Path: `src/lib/intelligence/soccer/`

| Module | Responsibility |
|--------|----------------|
| `types.ts` | `PlayerIntelligenceProfile`, dimensions, trajectory, comparables |
| `build-soccer-intelligence-profile.ts` | Orchestrator (pure) |
| `classify-soccer-role.ts` | Role label |
| `compute-soccer-dimensions.ts` + `soccer-dimension-raw-scores.ts` | 4 dims + evidence |
| `compute-soccer-trajectory.ts` | improving/stable/declining/insufficient_data |
| `league-percentiles.ts` | League × position cohort |
| `soccer-similarity-features.ts` / `explain-similarity.ts` | Why strings |
| `score-recruitment-fit.ts` + `recruitment-types.ts` | Ranked fit |
| `team-style-profile.ts` + `compute-tactical-fit.ts` | Team fit MVP |
| `*.test.ts` | Regression suite |

**Profile shape today** (`types.ts`):

- `role: string` (not nested object with confidence/evidence)
- `dimensions[]` with key/label/score/confidence/evidence
- `trajectory` as union string (evidence not nested)
- `limitations: string[]`
- `comparables[]` with `why[]`
- optional `leagueContext`

**Important:** your proposed nested `role { label, confidence, evidence }` is better long-term, but **soccer already ships a flatter shape**. Adapter layer should map soccer → shared contract without breaking soccer tests/UI.

---

## 3. All soccer-only gates (inventory)

### Hard throws / sport checks

| File | Gate |
|------|------|
| `src/features/scouting/queries/player-intelligence.ts` | throws if `sport !== "SOCCER"` |
| `src/features/scouting/queries/recruitment-candidates.ts` | throws if `brief.sport !== "SOCCER"` |
| `src/lib/intelligence/soccer/league-percentiles.ts` | returns null if sport ≠ SOCCER |

### UI conditionals

| File | Gate |
|------|------|
| `src/features/scouting/components/player-profile-view.tsx` | `isSoccer` wraps Intelligence + Tactical panels |
| `player-intelligence-panel.tsx` | imports soccer trajectory types |
| Recruitment form / results | soccer positions + `RecruitmentBrief` from soccer types |

### Direct soccer imports outside `intelligence/soccer/`

| File | Usage |
|------|--------|
| `queries/player-intelligence.ts` | buildSoccer… |
| `queries/recruitment-candidates.ts` | build + rank soccer |
| `queries/league-percentiles.ts` | soccer percentiles |
| `queries/tactical-fit.ts` | soccer tactical |
| `lib/export/scout-brief-context.ts` | soccer profile snapshot |
| `lib/export/scout-brief-intelligence.ts` | soccer profile type |
| `lib/ai/scout-report-generator.ts` | soccer profile |
| `features/scouting/lib/similarity.ts` | why only if soccer |
| `scripts/intel-*.ts` | soccer-only CLIs |
| `lib/actions/workspace.ts`, recruitment history | soccer `RecruitmentBrief` |

### Soft / domain assumptions

- Recruitment position set (ST, LW, …)
- Similarity feature extraction soccer-specific for “why”
- Compare insights helper `buildSoccerInsights` (BB/AF have branches elsewhere)
- Performance section soccer detailed metrics naming

**Do not rewrite all of these on day one.** Open gates behind dispatcher after BB profile exists.

---

## 4. Recommended shared contracts

### Principles

1. **Unify structure, not metrics.** Dimension `key` is a string (sport-owned vocabulary).  
2. **Thin contract first.** Avoid a 15-method class if soccer is pure functions.  
3. **Adapter over rewrite.** Soccer keeps `buildSoccerIntelligenceProfile`; adapter maps to shared type.  
4. **Recruitment / tactical as optional capabilities** on the engine (not every sport must implement tactical on day 1).

### Proposed types (`src/lib/intelligence/types.ts`)

```ts
type Sport = "SOCCER" | "BASKETBALL" | "AMERICAN_FOOTBALL";
type TrajectoryDirection = "improving" | "stable" | "declining" | "insufficient_data";

interface Evidence { label: string; value: string }

interface IntelligenceDimension {
  key: string;          // sport-specific
  label: string;
  score: number;        // 0–100
  confidence: number;   // 0–1
  evidence: Evidence[];
}

interface IntelligenceProfile {
  sport: Sport;
  playerId: string;
  season: string;
  role: {
    label: string;
    confidence: number;   // soccer adapter: derive or default
    evidence: Evidence[]; // soccer adapter: may be empty initially
  };
  styleLabel?: string;
  styleTraits?: string[];
  dimensions: IntelligenceDimension[];
  trajectory: {
    direction: TrajectoryDirection;
    evidence: Evidence[];
  };
  percentiles?: Array<{
    key: string;
    label: string;
    percentile: number;
    cohort: string;
    cohortSize: number;
    confidence: number;
    limitations?: string[];
  }>;
  limitations: string[];
  comparables: Array<{ playerId: string; score: number; why: string[] }>;
  leagueContext?: {
    league: string;
    leagueName?: string;
    position: string;
    season: string;
    cohortSize: number;
    scoringMethod: "league_percentile" | "absolute";
  };
}
```

### Engine interface (capability-based)

Prefer **capability object**, not forcing every method:

```ts
interface IntelligenceEngine {
  sport: Sport;
  buildProfile(player: Player, opts?: BuildProfileOptions): IntelligenceProfile;
  explainSimilarity?(a: Player, b: Player): string[];
  // optional later:
  rankRecruitment?(brief, profiles): RankedCandidate[];
  computeTacticalFit?(player, teamStyle): TacticalFitResult | null;
}
```

Percentiles can stay as **input table** to `buildProfile` (current soccer pattern) rather than a mandatory `computePercentiles` on every call.

### Dispatcher

```ts
// src/lib/intelligence/registry.ts
getIntelligenceEngine(sport: Sport): IntelligenceEngine | null
supportsIntelligence(sport: Sport): boolean
```

Return `null` / unsupported until AF ships — UI shows honest empty state, not soccer fallback.

---

## 5. Proposed dispatcher architecture

```
COMMON CONTRACT (types + registry)
          ↓
    ┌─────┼─────┐
    ↓     ↓     ↓
 SOCCER  BB     AF
 (adapter) (new) (later)
    ↓
queries: queryPlayerIntelligenceProfile(sport)
    ↓
UI: IntelligencePanel(profile)  // sport-agnostic rendering
```

**Soccer adapter:** wrap existing builder → map flat role/trajectory → nested shared shape.  
**BB engine:** new folder `src/lib/intelligence/basketball/`.  
**AF engine:** same later.

Preserve soccer unit tests against **soccer modules**; add contract-level tests that adapter output validates.

---

## 6. Basketball implementation plan

### Data available (do not invent)

From `PlayerSeasonStats` / match stats / scorecards:

- points, rebounds, assists, steals, blocks  
- FG%, 3P%  
- minutes, matches  
- league (NBA / NCAA / EuroLeague)  
- position → Guard / Wing / Big  
- capHit (NBA) — optional recruitment constraint later  

**Not reliably available:** true usage rate, on/off, tracking defense, advanced creation metrics unless already derived elsewhere. Role labels must stay **proxies from box-score rates + sample honesty**.

### Suggested BB dimensions (v1 — data-backed)

| Key | Basis |
|-----|--------|
| `scoring` | PTS per game / per 36, efficiency proxies |
| `shooting` | FG% / 3P% with volume floors |
| `playmaking` | AST rates |
| `defense` | STL / BLK rates (honest: limited) |
| `rebounding` | REB rates |

Drop “Ball Handling” / “Creation” as named dims until usage/TOV exist.

### Role classification (v1 — only if evidence supports)

Start conservative:

- Scoring Guard / Playmaking Guard  
- Two-Way Wing / Floor Spacer (if 3P volume)  
- Rim Finisher / Rebounding Big / Defensive Anchor (blocks+reb proxy)

Each role: label + confidence + evidence + limitations. Prefer fewer high-quality labels over a taxonomy marketing list.

### Percentiles

Cohort: `BASKETBALL + league + season + positionGroup`.  
**Never** mix NBA vs NCAA vs EuroLeague into one cohort. Document limitation when cohortSize < N.

### Trajectory

Reuse soccer honesty: need ≥2 seasons with meaningful minutes/games → else `insufficient_data`.

### Recruitment fit (after profile)

Brief: position group, age band, league preference, min dimension scores, optional capHit.  
Output: fit %, why[], risks[], confidence band — mirror soccer `score-recruitment-fit`.

### Order inside BB

1. types + raw scores + dimensions + role + trajectory + limitations  
2. league percentiles  
3. explainSimilarity  
4. tests  
5. query + CLI `--sport=BASKETBALL`  
6. UI panel (shared)  
7. recruitment fit + form positions  

---

## 7. American Football implementation plan

**Start after BB profile is green.**

### Data available

- passingYards, rushingYards, receivingYards, touchdowns, sacks, totalYards  
- minutes/games proxies, position groups QB / Skill / OL / Defense / Specialist  
- NFL vs CFB via league  

### Position-group dimensions (v1)

| Group | Dims (examples) |
|-------|-----------------|
| QB | passing production, efficiency proxies, TD rate |
| Skill | receiving/rushing production, explosiveness proxies |
| Defense | sacks/disruption where present; tackling proxies if present |
| OL | **high limitation risk** — may often return insufficient_data |
| Specialist | production with strong sample gates |

OL and sparse CFB rows will stress honesty — that is a feature, not a bug.

### Same contract path as BB

Profile → percentiles (NFL≠CFB) → similarity why → recruitment → (later) tactical.

---

## 8. Data limitations

| Issue | Impact |
|-------|--------|
| Soccer defensive stats incomplete without API-Football | Already in soccer limitations |
| BB advanced (USG%, RAPM, contest) absent | Roles/dims stay box-score proxies |
| AF OL / scheme data thin | Many insufficient_data / low confidence |
| Multi-season history uneven | Trajectory often insufficient |
| Player counts undocumented for BB/AF | Hard to claim coverage in pitch |
| Percentile cohort small in EuroLeague / CFB niches | Cap precision; show cohortSize |
| Legacy BB hijack fields | Prefer native columns; dual-write still exists |

**Schema changes for v1 intelligence:** likely **none** required. Optional later: persist computed profiles / recommendation outcomes.

---

## 9. Schema changes required

**v1: none.**

Optional later (not now):

- `PlayerIntelligenceSnapshot` table  
- recruitment outcome feedback  
- team style aggregates persisted  

Avoid premature persistence — soccer already computes headless.

---

## 10. Test strategy

| Suite | Must cover |
|-------|------------|
| Soccer | Keep all existing tests green |
| Adapter | Soccer profile maps to shared contract |
| BB | role, small sample, dims, percentiles league isolation, trajectory insufficient, similarity why, recruitment ranking |
| AF | same pattern when built |
| Regression | NBA scorer ≠ treated as NBA-equivalent when in NCAA cohort |

Goal: **behavior tests per sport**, not only “npm test passes”.

---

## 11. UI changes

### Shared

- `PlayerIntelligencePanel` renders `IntelligenceProfile` (sport-agnostic)  
- Dimension labels from profile, not hardcoded soccer keys  
- Limitations always visible  

### Remove over time

- `if (isSoccer)` around intelligence panel → `supportsIntelligence(sport)`  
- Keep sport-specific **forms** (recruitment positions) via SportRegistry metadata  

### Do not force

- Same number of dimensions  
- Same role vocabulary  
- Tactical panel before BB/AF team-style models exist (show “not available” honestly)

---

## 12. Risk assessment

| Risk | Type | Mitigation |
|------|------|------------|
| Big-bang rewrite of soccer | Tech | Adapter only |
| Fake BB roles without data | Product | Conservative taxonomy + evidence |
| Cross-league percentile pollution | Product/Tech | Hard cohort keys |
| AF OL empty intelligence | Product | Explicit insufficient_data |
| Scope: BB+AF+tactical together | Delivery | BB profile first |
| Pitch still soccer-coded | Product | Landing already fixed; app gates next |
| Abstractions engine with zero consumers | Tech | Wire one query+UI early |

---

## 13. Technical debt involved

- Large `player.repository.prisma.ts`  
- Soccer types living under `soccer/` while export/AI import them  
- Similarity why branching  
- Recruitment types soccer-coupled in workspace stores  
- BB dual-write legacy fields  
- No E2E  

Parity work should **not** include full repository split — note and continue.

---

## 14. Exact implementation order (approved slice)

### Now (Parity Wave 1)

1. `src/lib/intelligence/types.ts` — shared contract  
2. `src/lib/intelligence/registry.ts` — dispatcher  
3. Soccer adapter `toSharedIntelligenceProfile` / engine wrapper — **no logic rewrite**  
4. Refactor queries to use registry for soccer (behavior-identical)  
5. Basketball engine: profile + role + dims + trajectory + limitations  
6. Basketball percentiles (league-isolated)  
7. Basketball similarity why  
8. Basketball tests  
9. Query + CLI sport flag  
10. UI: open intelligence panel for BB  

### Next (Parity Wave 2)

11. Basketball recruitment fit + form  
12. Shared recruitment brief types  

### Then (Parity Wave 3)

13. American Football profile + tests  
14. AF queries/UI  
15. AF recruitment  

### Later (Parity Wave 4)

16. BB/AF team / tactical fit  
17. Persist snapshots / outcomes  
18. Embeddings only if similarity plateaus  

---

## 15. Final decisions (answers)

### 1. Continue OmniScout as main project?
**Yes.** Desk + soccer intelligence + multi-sport ingest is a coherent base. Starting over would waste the moat of honesty + workflow.

### 2. Is architecture strong enough?
**Yes, with a thin shared contract.** Pure-function engines + SportRegistry + Prisma multi-sport stats are enough. Do not introduce a heavy enterprise framework.

### 3. What first?
**Shared types + dispatcher + soccer adapter + Basketball Intelligence Profile (headless + tests).**

### 4. Basketball next engine?
**Yes.** Data richer and more uniform than AF for role/dims; scorecards/similarity already exist; parity docs ready.

### 5. What NOT to build now?
- AF before BB stable  
- BB/AF tactical fit  
- Auth / billing / more sports  
- Chatbot / generic LLM wrapper  
- Player embeddings  
- Schema for persisted intelligence  
- Massive soccer rewrite  
- Fake advanced metrics  

### 6. Biggest technical risk?
**Cross-league percentile / comparison mistakes** (NCAA≠NBA) and adapter drift breaking soccer.

### 7. Biggest product risk?
**Looking multi-sport in marketing while remaining soccer-only in the profile UI** — or shipping BB labels that feel invented.

### 8. Strongest long-term moat?
**Explainable decision support with declared limitations** + sport-native models + (later) tracked recommendation outcomes. Not raw data volume.

### 9. Highest real scout value feature?
**Recruitment fit with why/risks/confidence** on top of role + contextual percentiles. Profile alone is necessary; ranked fit is the decision moment.

### 10. Smallest proof OmniScout is a Sports Intelligence Platform?
**One basketball player page showing:** role + 4–5 dimensions with evidence + league/position percentile context + trajectory-or-insufficient + limitations — **without** an `isSoccer` gate — plus tests that NCAA and NBA cohorts never mix.

That single vertical slice beats three half-finished sports.

---

## Opinion on the user brief

**Strengths**

- Correct product north star (decision layer, not feed)  
- Correct peer-sport principle  
- Correct “shared structure ≠ shared metrics”  
- Correct headless-first / don’t break soccer  
- Correct honesty on trajectory and percentiles  
- Implementation order mostly sound  

**Tighten before coding**

1. **Cut Wave 1 scope** — stop after BB profile+UI; AF and tactical are later waves.  
2. **Engine interface lighter** — soccer is function-oriented; don’t force a fat class.  
3. **Role object nesting** — introduce via adapter; don’t rewrite soccer internals first.  
4. **Role taxonomy** — data-driven subset, not the full marketing list.  
5. **Recruitment after profile** — agree with your order, keep it Wave 2.  

**Bottom line:** This is the right program. Execute as **Intelligence Parity Wave 1 (contract + BB profile)**, not as a 13-phase big bang in one PR train.

---

*Audit complete. Ready to implement Wave 1 when approved.*
