# Football Intel Platform / OmniScout

Multi-sport scouting & analytics prototype (soccer, basketball, American football) built with Next.js, Prisma, and public sports feeds.

> **Prototype.** The current version uses a prototype dataset and scoring models that are still being refined — not a live club product. See [docs/SCORING.md](./docs/SCORING.md) and the in-app `/methodology` page.

---

## Scoring (short)

| Concept | Rule (soccer) |
|---------|----------------|
| Goals/90 | `(goals / minutes) × 90`, soft-capped at **1.8** |
| Rating | Proxy from capped g/90 & a/90 when minutes ≥ 450 |
| Top Prospect | Age ≤ 23, rating ≥ 7.0, minutes ≥ 450 |
| Market Opportunity | Age ≤ 25, rating ≥ 7.2, value ≤ €8M, minutes ≥ 450 |

Details: [docs/SCORING.md](./docs/SCORING.md).

---

## Stack

- **Framework:** Next.js (App Router)
- **Language:** TypeScript
- **Database:** Supabase (PostgreSQL) + Prisma (`DATA_SOURCE=db` or `mock`)
- **UI:** Tailwind CSS

---

## Architecture notes

- Scouting lists and hubs are optimized for demo performance (pagination, capped payloads).
- ESPN public feeds power match/tournament hubs with timeouts and degrade paths.
- Photos/crests may be enriched via API-Sports and cached in DB when configured.

For methodology and interview talking points, see [docs/SCORING.md](./docs/SCORING.md). Setup variables: `.env.example`.
