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

## Freeze de dados (decisão 2026-08-02)

Showcase soccer **congelado** para avançar Product UI (feedback: UI monocromática / pouco intuitiva / “cara de AI”):

| Frente | KPI à data do freeze | Nota |
|--------|----------------------|------|
| Big5 | **~85%** ≥1 temporada produtiva | Meta aspiracional 90% — retomar em background nos resets API |
| Brasileirão | **~81%** | ESPN 2025 esgotou; CSV/API depois |

Piso AND mantém-se (≥4 apps **e** ≥270′). Não reabrir ETL pesado em paralelo com redesign UI.

## Ordem estratégica

| Fase | Foco | Estado |
|------|------|--------|
| **1** | Big5 showcase | **Freeze** ~85% |
| **2** | Brasileirão | **Freeze** ~81% |
| **3** | **Product UI (AGORA)** | Landing Fase 1 ✅ · **Desk Fase 2** (shadcn + analytics) — `docs/PRODUCT-UI-NORTH-STAR.md` |
| **4** | Ligas de transição (PT, NL; MLS depois) | Depois da UI core |
| **5** | Colleges + High School | Tese; ETL só com UI estável |
| **6** | BB/AF profundos · auth/piloto | Depois |

## O que fazer AGORA

1. **Product UI — Fase 2 (Desk):** hub scouting / shell / perfil com densidade analytics + shadcn (`docs/PRODUCT-UI-NORTH-STAR.md`). Landing Fase 1: masthead sem fotos duplicadas; capítulos com foto; workflow/trust/close.
2. Dados: só manutenção leve / low-quota no reset — **não** bloquear UI.
3. Não paralelizar ETLs pesados com refactors visuais grandes.

## Regras de dados (ainda válidas)

- `--create-missing` opt-in; ESPN com `seasonYear` → no-create.
- Um ETL pesado de cada vez (P1017).
- AppSec: ver `AUDIT-OmniScout.md` (#1+#3 feitos; #2 Upstash adiado).

## Higiene de commits

- 1 commit por fatia útil; agrupar docs+código da mesma mudança.
- Não abrir PR a cada micro-ajuste.
