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
| Big5 | ~**85%** → meta **≥90%** | Low-quota diário; showcase season **2025/26** |
| Brasileirão 2026 | Boxscores ESPN + cron | `bra.1` seasonYear=2026 |
| Clubs / team stats | **ESPN + DB only** | Sem StatsBomb open-data |
| Desk UI | Editorial + public beta copy | `/demo` roteiro; BB/AF secondary |
| Época EU | `CURRENT_SEASON=2025/26` | `NEXT_EUROPEAN_SEASON=2026/27` + `EUROPEAN_NEXT_SEASON_LIVE=false` até kickoff |

Piso AND mantém-se (≥4 apps **e** ≥270′). Um ETL pesado de cada vez (P1017).

## O que fazer AGORA

1. Continuar low-quota até Big5 ≥90%; BR boxscores recentes.
2. Em ~14/08: `EUROPEAN_NEXT_SEASON_LIVE=true` + `ESPN_EUROPEAN_SEASON_YEAR=2026`.
3. Demo pública: seguir `/demo` (soccer first).
4. Cron soccer já faz boxscores 2d + enrich-defense (limit 40).

## Regras de dados (ainda válidas)

- `--create-missing` opt-in; ESPN com `seasonYear` → no-create.
- Um ETL pesado de cada vez (P1017).
- AppSec: ver `AUDIT-OmniScout.md` (#1+#3 feitos; #2 Upstash adiado).

## Higiene de commits

- 1 commit por fatia útil; agrupar docs+código da mesma mudança.
- Não abrir PR a cada micro-ajuste.
