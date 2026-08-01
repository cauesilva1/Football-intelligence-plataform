# Startup data runbook — Big5 → 90%

> Meta: **≥90% dos jogadores Big5 com ≥1 temporada produtiva** (`npm run data:coverage` → Startup KPI).  
> Não chase 90% de todo o banco (AF/NCAA stubs).

## Diário (quando a quota API resetar)

```bash
# 1) Prior season lines (API-Football ≤2024) — ~100 calls/day
npm run data:backfill-soccer-seasons -- --teams=40 --season=2024

# 2) Medir
npm run data:coverage

# 3) Se ainda houver pending clubs, repetir no dia seguinte
```

## ESPN (sem quota API — não paralelizar com outro ETL pesado)

```bash
PRISMA_LOG_QUIET=1 npm run data:backfill-big5 -- --days=20 --end=2025-05-25 --seasonYear=2024
```

Se aparecer spam `P1017` / connection closed: pare, use `PRISMA_LOG_QUIET=1`, lotes `--days=20`, uma liga por vez se preciso.

## Segurança Supabase

```bash
npm run db:secure-rls
```

## Depois do KPI ≥90%

1. Commit dos scripts/docs (pedir explicitamente).
2. NCAA basketball histórico.
3. AF dual-season só com produção ESPN real.
4. Auth Phase 5b só com piloto.

## Comandos úteis

| Comando | Uso |
|---------|-----|
| `npm run data:coverage` | KPI Big5 + depth por sport |
| `npm run data:fix-soccer-leagues` | Corrige `league: Série A` legado |
| `npm run data:sync-euroleague -- --all-played --limit=100` | EL (já ~402/402) |
