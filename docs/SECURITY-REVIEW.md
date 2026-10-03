# OmniScout — security review

**Date:** 2026-10-02
**Scope:** repository audit before Batch 4. No product fixes applied.
**Method:** `npm audit`, git history and working-tree secret sweep, API route and server-action read, search for `dangerouslySetInnerHTML` / raw SQL / `innerHTML`.

Nothing in this file is a live secret. Local credential values were not copied here.

---

## 1. npm audit

`npm audit` reported **1 critical, 10 high, 1 moderate** (12 total). Installed direct versions: `next@16.2.10`, `axios@1.18.1`, `postcss@8.5.16`, `tailwindcss@3.4.19`.


| Package        | Severity | Fix without a major bump?                                                                                                                                                                                                                                                                                                                                                                                                                          |
| -------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `next`         | critical | Yes. Installed `16.2.10`. Critical items include unauthenticated RCE in the Image Optimization API when AVIF is used, and RCE in `next/og` `ImageResponse` (`>=16.2.0 <16.3.6`). Also high: middleware/proxy bypass, Server Action DoS, Server Action SSRF, rewrite SSRF. A non-major bump to `>=16.3.6` covers the published ranges. Next minors can still change runtime behavior, so this needs a regression pass, not a blind `npm audit fix`. |
| `axios`        | high     | Yes. Direct dependency `1.18.1`. High issues (ReDoS, HTTP/2 DoS, prototype-pollution gadgets, `maxRedirects: 0` not enforced by the fetch adapter) are fixed in `>=1.20.0`.                                                                                                                                                                                                                                                                        |
| `postcss`      | high     | Yes. Direct `8.5.16` is still inside the vulnerable ranges (arbitrary `.map` file read via `sourceMappingURL`, through `<=8.5.22`). Fix is a later **8.5.x**, not a major.                                                                                                                                                                                                                                                                         |
| `sharp`        | high     | Yes, non-major. Transitive. libvips / libheif issues fixed in `>=0.35.4`.                                                                                                                                                                                                                                                                                                                                                                          |
| `nanoid`       | high     | Yes, non-major. Transitive. Infinite loop in custom/non-secure generators, fixed in `>=3.3.18`.                                                                                                                                                                                                                                                                                                                                                    |
| `browserslist` | high     | Yes, non-major. Transitive. Unbounded memory growth and untrusted `browserslist-stats.json` crash, fixed in `>4.28.6`.                                                                                                                                                                                                                                                                                                                             |
| `fast-glob`    | high     | Yes, non-major. Transitive via `micromatch` / `braces`. `npm audit` marks `fixAvailable: true` on `fast-glob` itself.                                                                                                                                                                                                                                                                                                                              |
| `braces`       | high     | **No.** Stack exhaustion on deeply nested patterns. The available fix is `tailwindcss@4.3.3` (`isSemVerMajor: true`).                                                                                                                                                                                                                                                                                                                              |
| `micromatch`   | high     | **No.** Pulled through `braces`. Same Tailwind 4 major.                                                                                                                                                                                                                                                                                                                                                                                            |
| `chokidar`     | high     | **No.** Pulled through `braces`. Same Tailwind 4 major.                                                                                                                                                                                                                                                                                                                                                                                            |
| `tailwindcss`  | high     | **No.** `3.4.19` is in the vulnerable range only because of `chokidar` / `fast-glob` / `micromatch`. The audit fix is **Tailwind 4.3.3**, a major.                                                                                                                                                                                                                                                                                                 |


Recommended order, after approval: bump `next` to `>=16.3.6`, `axios` to `>=1.20.0`, and `postcss` within 8.5.x. Leave the Tailwind 3 → 4 jump for a separate change.

---



## 2. Secrets


| Check             | Result                                                                                                                                                                                                                                                |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tracked env files | Only `.env.example`. `git ls-files` does not track `.env`.                                                                                                                                                                                            |
| `.gitignore`      | Ignores `.env` and `.env.local` (`.gitignore` lines 4–5). It does **not** ignore `.env.production`, `.env.development`, or `.env.`*.                                                                                                                  |
| History           | No commit adds `sk-or-v1-`. `OPENROUTER_API_KEY=` in history (`6c5ed4a`) is empty. `DATABASE_URL` / `DIRECT_URL` in `.env.example` are placeholders (`[PROJECT_REF]`, `[PASSWORD]`, `[REGION]`), including `11e38eb` and `560ca69`.                   |
| Working tree      | A local `.env` exists, is gitignored, and holds non-empty `DATABASE_URL`, `DIRECT_URL`, `OPENROUTER_API_KEY`, and `APISPORTS_KEY`. Values are not reproduced in this review.                                                                          |
| `NEXT_PUBLIC_`    | The only runtime use is `NEXT_PUBLIC_APP_URL` as the OpenRouter `HTTP-Referer` header in `src/lib/ai/scout-report-generator.ts`. `.env.example` also documents a commented Supabase anon URL/key. No secret is assigned to a `NEXT_PUBLIC_` variable. |


**Low —** `.gitignore` **is narrower than** `.env`***.** A future `.env.production` could be committed. Recommended fix: ignore `.env`* and re-include `!.env.example`.

**Informational — local** `.env` **is live.** It is not in git. If this workspace is copied or the file is ever force-added, rotate `OPENROUTER_API_KEY`, `APISPORTS_KEY`, and the database password.

---



## 3. API surface

There is no user login. Middleware (`src/middleware.ts`) only sets an anonymous httpOnly device cookie. “Auth” below means a shared secret or an equivalent gate, not an end-user session.

### Route handlers


| Route                                                         | Auth                                                                              | Abuse                                                                                                                                                                                                                                                                 |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/cron/soccer` (`src/app/api/cron/soccer/route.ts`)   | Yes. `CRON_SECRET` via `isCronAuthorized` (`timingSafeEqual`). `maxDuration` 300. | With the secret, it runs a 2-day boxscore backfill plus API-Football defense enrich (`limit: 40`). That spends upstream quota. The secret comparison returns early when lengths differ (`src/lib/cron/authorize-request.ts` lines 8–11), which leaks only the length. |
| `GET /api/cron/basketball`                                    | Same secret gate.                                                                 | Triggers `runBasketballDailySync`. Same quota concern once authorized.                                                                                                                                                                                                |
| `GET /api/cron/american-football`                             | Same secret gate.                                                                 | Triggers `runFootballDailySync`.                                                                                                                                                                                                                                      |
| `GET /api/players/[id]` (`src/app/api/players/[id]/route.ts`) | No. Public read of one player, optional `season` query.                           | Not an unbounded list. A client can scrape ids. Returns the repository player JSON. No write, no LLM.                                                                                                                                                                 |




### Server actions


| Action                                                                                                                              | Auth                                          | Abuse                                                                                                                                                                                                                                                                                                       |
| ----------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `createScoutingReport` (`src/lib/actions/reports.ts`)                                                                               | No user auth. Rate limit **5 / 10 min / IP**. | Calls OpenRouter when `OPENROUTER_API_KEY` is set, then writes a report. The limit is in-memory (`src/lib/rate-limit.ts`) and the key is the first `x-forwarded-for` hop (`src/lib/action-guard.ts` lines 8–11), so it is best-effort per instance and can be rotated by spoofing that header off-platform. |
| `getReportsForPlayer`                                                                                                               | No.                                           | Read. No rate limit. In db mode it is scoped to the device cookie; on failure it falls through to a process-wide file store (`src/lib/storage/index.ts` lines 22–28).                                                                                                                                       |
| `getPlayers`, `getPlayer`, `getPlayersForComparison`, `getAllPlayersLite`, `searchPlayersLiteAction` (`src/lib/actions/players.ts`) | No.                                           | Search is capped (`take` ≤ 50, search ≤ 80 chars, `ensureIds` ≤ 10). `getPlayers` still reaches repository paths that load up to `MAPPED_FILTER_CAP` (1200) rows (`src/features/scouting/repository/player.repository.prisma.ts`). No rate limit.                                                           |
| `getPlayersByIds`                                                                                                                   | No.                                           | Capped at 50 ids, but fans out to `findById` per id. No rate limit.                                                                                                                                                                                                                                         |
| `getTeams`, `getTeam`, `getDashboardOverview` (`src/lib/actions/teams.ts`)                                                          | No.                                           | Dashboard overview is a heavy aggregate (sample of players, charts, rankings). No rate limit.                                                                                                                                                                                                               |
| `enrichAmericanFootballPlayerSeasonsAction`                                                                                         | No user auth. **12 / hour / IP.**             | Writes season rows and calls ESPN. Same in-memory limiter.                                                                                                                                                                                                                                                  |
| Workspace shortlist and recruitment history (`src/lib/actions/workspace.ts`)                                                        | Device cookie only, not a user account.       | `syncWorkspaceShortlist` replaces the device’s rows with the client payload. `dedupeEntries` does not cap count or note length (`src/lib/workspace/shortlist-store.ts`). A caller who can set the cookie can grow that device’s rows.                                                                       |




### OpenRouter key

`OPENROUTER_API_KEY` is read only in `generateWithOpenRouter` (`src/lib/ai/scout-report-generator.ts` line 511). That module is imported only by the server action in `src/lib/actions/reports.ts`. It is not imported from a client component. The key is sent as `Authorization` on the server-side `fetch` to OpenRouter. It is not placed on a `NEXT_PUBLIC_` variable and is not returned in the `ScoutingReport` payload (`generatedBy` is the model id). **The key does not reach the client.**

---



## 4. Injection and XSS


| Search                                        | Result                                                                                                                                                     |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dangerouslySetInnerHTML`                     | No matches under `src/`.                                                                                                                                   |
| `innerHTML`, `eval(`, `new Function(`         | No matches under `src/`.                                                                                                                                   |
| `$queryRaw` / `$executeRaw` with user strings | No tagged-template interpolation of request input.                                                                                                         |
| `$queryRawUnsafe` / `$executeRawUnsafe`       | Only `src/scripts/secure-rls.ts`. Table names come from a constant list, not from a request. Still string-built SQL; safe today because the list is fixed. |


User-facing copy (scout notes, comparison sentences, tactical-fit reasons) is rendered as React text, which escapes HTML.

**Low —** `secure-rls.ts` **uses unsafe raw SQL.** Recommended fix, if touched: keep the allowlist and use `Prisma.sql` identifiers, or leave the script as an operator-only command and do not import it from the app.

---



## 5. Findings to approve


| Severity | Location                                                                                     | Finding                                                                                                        | Recommended fix (not applied)                                                                                                                                            |
| -------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Critical | `package.json` (`next@16.2.10`)                                                              | Image Optimization AVIF RCE and `next/og` RCE, plus high Server Action DoS/SSRF, are fixed only in `>=16.3.6`. | Bump `next` to `>=16.3.6` and re-run `npm run build`.                                                                                                                    |
| High     | `package.json` (`axios@1.18.1`)                                                              | ReDoS, HTTP/2 DoS, and redirect/`maxRedirects` bypass in `1.18.1`.                                             | Bump `axios` to `>=1.20.0`.                                                                                                                                              |
| High     | `postcss@8.5.16`                                                                             | Attacker-controlled CSS `sourceMappingURL` can read `.map` files.                                              | Bump `postcss` within 8.5 to a version `>8.5.22`.                                                                                                                        |
| High     | `tailwindcss@3.4.19` → `braces` / `micromatch` / `chokidar`                                  | Transitive DoS. The audit fix is Tailwind 4.                                                                   | Do not major-bump Tailwind in this pass. Accept the dev-toolchain risk or pin after a dedicated Tailwind 4 migration.                                                    |
| Medium   | `src/lib/rate-limit.ts`, `src/lib/action-guard.ts`                                           | Report generation and AF enrich limits are per-process memory and keyed off the first `x-forwarded-for` value. | On Vercel, use the platform client IP. For the OpenRouter action, add a second global cap (or `REPORTS_DISABLED`) so one instance cannot be bypassed by header rotation. |
| Medium   | `src/lib/actions/teams.ts` `getDashboardOverview`; `src/lib/actions/players.ts` `getPlayers` | Public server actions with no rate limit. Player search can pull up to 1200 mapped rows.                       | Rate-limit these actions the same way as reports, and keep the existing `take` caps.                                                                                     |
| Medium   | `src/lib/workspace/shortlist-store.ts` `replaceWorkspaceShortlist`                           | No cap on entry count or note size.                                                                            | Cap entries (for example 200) and note length before `createMany`.                                                                                                       |
| Medium   | `src/lib/storage/index.ts`                                                                   | DB failure falls through to a shared file store, so a report read/write is no longer device-scoped.            | On DB failure, return empty / throw. Do not read the global file store in db mode.                                                                                       |
| Low      | `.gitignore`                                                                                 | `.env.production` and similar names are not ignored.                                                           | Ignore `.env*` except `.env.example`.                                                                                                                                    |
| Low      | `src/lib/cron/authorize-request.ts`                                                          | `timingSafeEqual` bails out when lengths differ.                                                               | Compare against a fixed-length digest, or hash both sides before compare.                                                                                                |
| Low      | `src/scripts/secure-rls.ts`                                                                  | `$queryRawUnsafe` with interpolated identifiers from a constant list.                                          | Leave as an operator script, or switch to an allowlisted `Prisma.sql` form.                                                                                              |


No critical or high issue in this pass is an application secret in git, an XSS sink, or the OpenRouter key leaking to the browser.

---



## 6. Tests

`npm test`: **114 passed, 0 failed, 56 suites.**

### Batch 1–3 coverage


| Area              | Pure functions                                                                                                                                       | Covered before this pass                                                                           | Added now                                                                                                                                                     |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dedupe / identity | `dedupeSoccerIdentities`, `lookupFbrefIdentity`, `fbrefIdentityKey`                                                                                  | Anselmino/Ramsdale dedupe and 20 position spot-checks in `src/lib/soccer/batch1-integrity.test.ts` | No new dedupe case. The minutes-winner path is already asserted.                                                                                              |
| Fixture integrity | `shouldQuarantineFixture`, `stageTextContradictsScoreboard`, `isConmebolClubCompetition`, `isNationalTeamCompetition`, `isNationalSideDirectoryTeam` | Libertadores quarantine, a clean Brazilian final, World Cup national side vs Flamengo              | Sudamericana, UEFA Euro, empty stage, stage line that names a participant, stage line that names a third club, name-equals-country, `International` excluded. |
| Club labels       | `formatClubLabel`, `clubShortCode`                                                                                                                   | `NAN` never renders                                                                                | Already covered.                                                                                                                                              |
| xG / match rating | `formatExpectedGoalsRate`, `formatMeasuredExpectedGoal`, `computeMatchRating`, `formatStoredMatchRating`                                             | Unmeasured 0 vs measured 0; flat 6.5 hidden                                                        | Already covered.                                                                                                                                              |
| Formatters        | `formatDisplayNumber`, `formatInputNumber`, `formatChartNumber`                                                                                      | Float trim, integer, empty input, `99999999999`                                                    | Chart array join and non-numeric tooltip → `—`.                                                                                                               |
| Compare scale     | `soccerCreativityIndex`, `soccerCreationIndex`, `soccerCrossesPer90`                                                                                 | High cross volume stays ≤ 100; leaked season total is recomputed                                   | Boundary: per-90 of 15 stays; `15.01` is recomputed from minutes.                                                                                             |
| Goals chart       | `soccerGoalsPer90ByRole`                                                                                                                             | Mean g/90 so a larger CM bucket cannot beat attackers                                              | Already covered.                                                                                                                                              |
| Copy              | `buildComparisonReport` (plural helper is private)                                                                                                   | None                                                                                               | “1 superior dimension” and no `(s)` hack.                                                                                                                     |




### Follow-ups (not pure, or not worth a behavior-neutral unit test)

- `onIndexScale` in `src/components/charts/comparison-bar-chart.tsx` and `src/components/charts/stat-radar-chart.tsx` is pure but lives inside client chart modules. A test would need an export or a rendered chart.
- Dashboard empty state in `src/features/analytics/components/dashboard-charts-section.tsx` (one season does not mount the line chart) is a server component. Covered by the local browser check in Batch 3, not by `npm test`.
- Recruitment inputs in `src/features/recruitment/components/recruitment-search-form.tsx` are UI state. The formatter they call is tested; the controlled input is not.
- `lookupFbrefIdentity` when `birthYear === 2000` skips the exact-key path (`src/lib/soccer/fbref-identity.ts`). Needs a named fixture born in 2000 before a stable assertion.
- `europeanClubInConmebol` matching a Big Five squad by name when `country` is empty. Not exercised.
- Rate limiter, cron authorization, and the player/dashboard server actions need request-level tests, not pure-function tests.
- OpenRouter prompt honesty (missing xG, cohort < 8) is Batch 4, not this pass.

