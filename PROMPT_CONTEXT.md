# Contexto do Projeto: OmniScout

Você é meu co-piloto de desenvolvimento no **OmniScout**, uma plataforma freemium de *Sports Intelligence* e scouting multi-desporto (Futebol, Basquete e Futebol Americano).

## Diferencial de mercado

O nosso diferencial **não** é volume de dados inventados. É a combinação de:

1. **Honestidade e profundidade dos dados** — rejeitar stubs falsos e KPIs de vaidade.
2. **Cobertura de mercados negligenciados pelas gigantes** — ligas de transição, e a médio prazo o ecossistema de **Colleges / High School**.

## Stack tecnológica atual

- **Frontend/Fullstack:** Next.js (App Router) + TypeScript + Tailwind CSS
- **Banco de Dados/ORM:** Supabase PostgreSQL + Prisma (RLS lockdown nas tabelas)
- **Pipelines de Dados:** Scripts customizados (`npm run data:*`)

## Sprint soccer live (até 14 ago 2026)

Europeus abrem ~14/08; Brasileirão **2026** já corre. Freeze de dados **reaberto** para dados reais.

| Frente | Estado | Nota |
|--------|--------|------|
| Big5 | ~**85%** → meta **≥90%** | Low-quota diário (`data:backfill-soccer-seasons --low-quota`) |
| Brasileirão 2026 | Boxscores ESPN ativos | `data:backfill-boxscores --slug=bra.1 --seasonYear=2026` |
| Clubs / team stats | **ESPN + DB only** | StatsBomb open-data **não** alimentar Clubs (épocas stale) |
| Desk UI | Editorial light shipped | Manter estável; não expandir BB/AF |

Piso AND mantém-se (≥4 apps **e** ≥270′). Um ETL pesado de cada vez (P1017).

## Ordem estratégica

| Fase | Foco | Estado |
|------|------|--------|
| **1** | Big5 showcase live | **Ativo** — push 90% + prep 2026/27 |
| **2** | Brasileirão 2026 | **Ativo** — cron/boxscores |
| **3** | Product UI desk | Landing + desk editorial ✅ — polish só se não bloquear dados |
| **4** | Ligas de transição (PT, NL; MLS depois) | Depois do go-live europeu |
| **5** | Colleges + High School | Tese; ETL só com soccer estável |
| **6** | BB/AF profundos · auth/piloto | Depois |

## O que fazer AGORA

1. **Dados soccer:** BR 2026 live + Big5 low-quota → 90% + flip `CURRENT_SEASON` para 2026/27 antes de 14/08.
2. **Sem StatsBomb** em Clubs/detail — só ESPN standings + `TeamStatistic`.
3. Um ETL pesado de cada vez; commit por fatia.

## Regras de dados (ainda válidas)

- `--create-missing` opt-in; ESPN com `seasonYear` → no-create.
- Um ETL pesado de cada vez (P1017).
- AppSec: ver `AUDIT-OmniScout.md` (#1+#3 feitos; #2 Upstash adiado).

## Higiene de commits

- 1 commit por fatia útil; agrupar docs+código da mesma mudança.
- Não abrir PR a cada micro-ajuste.
