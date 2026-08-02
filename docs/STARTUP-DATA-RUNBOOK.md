# Startup data runbook — Big5 → 90% → Brasileirão

> Meta 1: **≥90% dos jogadores Big5** com ≥1 temporada produtiva (`npm run data:coverage` → Startup KPI).  
> Meta 2 (logo a seguir, **antes** de NCAA/AF): **≥90% Brasileirão Série A** com a mesma barra de honestidade.  
> Piso soccer (código): **≥4 aparições e ≥270 minutos** (AND). Não redefinir como OU para inflar o KPI.  
> Não chase 90% de todo o banco (AF/NCAA stubs). MLS não bloqueia o BR.

## Diário (quando a quota API resetar)

```bash
# Low-quota (recomendado): ~12 calls — 12 clubes × 1 página, zeros com API id primeiro
npm run data:backfill-soccer-seasons -- --low-quota

# Ou explícito:
# npm run data:backfill-soccer-seasons -- --teams=12 --season=2024 --refresh --big5-only --prefer-zeros --max-pages=1

# 2) Medir
npm run data:coverage

# 3) Repetir no dia seguinte até KPI ≥90%
```

## ESPN curto (se API esgotada — não paralelizar)

```bash
# Janela curta ≠ marathon de 35 dias (ex.: fev/mar 2025)
PRISMA_LOG_QUIET=1 npm run data:backfill-big5 -- --days=12 --end=2025-03-10 --seasonYear=2024
```

## Depois do KPI Big5 ≥90%

1. Podar invent stubs se ainda diluírem o denominador (`npm run data:prune-soccer-stubs -- --force-match-stats`).
2. **Brasileirão (pilar #2):** backfill ESPN `bra.1` + season lines API (sem `--create-missing`); medir KPI BR.
3. Freeze docs/MVP (Big5 + BR).
4. **Product UI** — redesign cara de produto ([PRODUCT-UI-NORTH-STAR.md](./PRODUCT-UI-NORTH-STAR.md); insp. Opta Analyst / theanalyst.com).
5. Ligas de transição (PT, NL; MLS depois) — opcional, ainda em soccer.
6. Colleges/HS e aprofundar NCAA/AF — só após freeze soccer + UI base.
7. Auth Phase 5b só com piloto.

## Segurança Supabase

```bash
npm run db:secure-rls
```

## Comandos úteis

| Comando | Uso |
|---------|-----|
| `npm run data:coverage` | KPI Big5 (+ KPI BR quando existir no script) + depth por sport |
| `npm run data:prune-soccer-stubs` | Remove invent stubs sem temporada produtiva |
| `npm run data:fix-soccer-leagues` | Corrige `league: Série A` legado |
| `npm run data:sync-euroleague -- --all-played --limit=100` | EL (já ~402/402) |
