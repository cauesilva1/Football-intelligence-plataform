# Demo data source (`DATA_SOURCE`)

> For demos and local runs — avoid mixing mock UI with “live DB” claims.

## Modes

| Value | Behavior | When to use |
|-------|----------|-------------|
| `mock` (default in `.env.example`) | In-memory generators, no Postgres | Vercel preview without DB, offline UI work |
| `db` | Prisma + Postgres (`DATABASE_URL`) | Real multi-sport inventory, intelligence demos, `npm run data:coverage` |

## Demo checklist

1. Confirm `.env` / Vercel env: `DATA_SOURCE=db` **or** `mock` — never leave ambiguous.
2. If pitching BB/AF coverage or EuroLeague honesty, use **`db`** and run `npm run data:coverage` first.
3. If `DATA_SOURCE=mock`, say so in the demo (“prototype generators”) — do not claim ESPN roster depth.
4. Prototype banner + `/methodology` already disclose sample limits.

## Ops

```bash
# Live coverage (requires DATA_SOURCE=db)
npm run data:coverage

# Route timing smoke (optional)
npm run perf:routes
```

## Tech debt note

`player.repository.prisma.ts` remains large (list vs sync). Split when it blocks a change — not a product blocker for demos.
Full browser E2E is deferred; use `perf:routes` + manual `/players` + `/recruitment?replacePlayerId=` smoke until a pilot needs CI E2E.
