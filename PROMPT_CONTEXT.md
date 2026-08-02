# Contexto do Projeto: OmniScout

Você é meu co-piloto de desenvolvimento no **OmniScout**, uma plataforma freemium de *Sports Intelligence* e scouting multi-desporto (Futebol, Basquete e Futebol Americano).

## Diferencial de mercado

O nosso diferencial **não** é volume de dados inventados. É a combinação de:

1. **Honestidade e profundidade dos dados** — rejeitar stubs falsos e KPIs de vaidade.
2. **Cobertura de mercados negligenciados pelas gigantes** — ligas de transição, e a médio prazo o ecossistema de **Colleges / High School** (captação de prospectos e transição de atletas-estudantes).

## Stack tecnológica atual

- **Frontend/Fullstack:** Next.js (App Router) + TypeScript + Tailwind CSS
- **Banco de Dados/ORM:** Supabase PostgreSQL + Prisma (RLS lockdown nas tabelas)
- **Pipelines de Dados:** Scripts customizados (`npm run data:*`)

## Visão de produto e expansão (ordem estratégica)

Ordem **rígida** — não pular etapas:

| Fase | Foco | Meta |
|------|------|------|
| **1 — Agora** | Showcase Big5 (PL, La Liga, Serie A, Bundesliga, Ligue 1) | Startup KPI ≥ **90%** com ≥1 temporada produtiva real (piso: ≥4 aparições **e** ≥270′ — AND, como em `data-depth.ts`) · sem stubs inventados |
| **2 — Em seguida** | **Brasileirão Série A** (pilar #2, não “liga genérica”) | Mesma barra ≥90% e o mesmo piso AND · ESPN `bra.1` + season lines · sem create-missing |
| **3 — Médio prazo (soccer)** | Ligas de transição (ex.: Portugal, Holanda; MLS depois do BR) | Expandir horizontalmente **dentro do futebol** com a mesma disciplina |
| **4 — Product UI (pós-freeze soccer)** | Redesign para cara de **produto completo** (não protótipo AI) | North star: [Opta Analyst](https://www.statsperform.com/about/opta-analyst/) + [theanalyst.com](https://theanalyst.com/) — ver `docs/PRODUCT-UI-NORTH-STAR.md` |
| **5 — Tese / próximo grande mercado** | **Colleges + High School** | Arquitetura e narrativa prontas; **ETL/produto só após freeze Big5+BR** |
| **6 — Depois** | Aprofundar Basketball (NCAA) e American Football · auth/piloto | Produção real, sem vaidade; UI já no design system da fase 4 |

**Não fazer agora:** redesenhar UI / inventar telas novas antes do freeze Big5+BR; paralelizar ETLs pesados; chasear 90% de AF/NCAA/HS inteiros; tratar BR como igual a MLS/PT no curto prazo.

## Regras rígidas de engenharia de dados

- `--create-missing` na API é estritamente **opt-in** (nunca default).
- Backfills ESPN **não** criam plantéis fictícios quando `seasonYear` está definida.
- Limpeza: `npm run data:prune-soccer-stubs` (usar `--force-match-stats` só **depois** de backfills ESPN terminarem).
- **Um ETL pesado de cada vez** — evitar P1017 no pooler Prisma/Supabase.
- Priorizar integridade e limpeza dos dados sobre features de UI **até** o freeze Big5+BR; a fase Product UI vem a seguir (não em paralelo com ETL).

## O que fazer AGORA (pós-lote ESPN em curso)

Quando houver quota API (reset diário do provider):

1. **Low-quota fill** — `npm run data:backfill-soccer-seasons -- --low-quota` (~12 calls: 12 clubes × 1 página, zeros com `apiSportsId` primeiro).
2. **Medir** — `npm run data:coverage` → *Startup KPI — Soccer Big5 showcase*.
3. Repetir nos dias seguintes até ≥90%; ESPN só em janelas curtas se necessário.
4. **Só então** — profundidade **Brasileirão** (KPI BR + fills `bra.1`/API).
5. Não redesenhar UI antes do freeze Big5+BR.

## Como usar no Cursor

```
@PROMPT_CONTEXT.md analise o estado atual e me ajude com [tarefa]
```

Documentos irmãos:

- `docs/OMNISCOUT-MVP.md` — narrativa MVP / pitch
- `docs/PRODUCT-UI-NORTH-STAR.md` — design futuro (Opta Analyst / The Analyst)
- `docs/STARTUP-DATA-RUNBOOK.md` — comandos Big5 → BR
- `docs/DATA-COVERAGE.md` — inventário de cobertura
