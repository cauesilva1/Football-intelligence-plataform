# 🗺️ Roadmap — Football Intelligence Platform

Este documento lista o que falta para levar o produto de **protótipo funcional**
para **produção real**, organizado por prioridade.

> **Product stance:** soccer is the **reference sport** for the scouting workflow.
> Basketball and American Football reuse the same playbook later — do not expand those hubs until soccer stages in `docs/SOCCER-SCOUT-PLAN.md` land.

## ✅ Já entregue (não reabrir como “falta”)

- [x] **UI em inglês** (labels de scouting/torneios; Brasileirão/La Liga como nomes próprios)
- [x] **Rankings U23 / Hidden Gems** alinhados ao dashboard (≥ 450', value score)
- [x] **Copa do Mundo no DB** com seed de seleções nacionais + hub preferindo Match saudável
- [x] **Testes automatizados (scoring)**: unit tests para `per90` e `soccer-rankings`
- [x] **Paginação e filtros com querystring**: `/players` e `/scouting` sincronizam filtros na URL (`parsePlayerFilters` / `buildFilterUrl`); prefs em localStorage só restauram URL vazia
- [x] **Shortlist + notes no dispositivo**: My Players + scout notes em localStorage (não multi-user / DB)
- [x] **Rating soccer unificado**: `src/lib/scoring/soccer-rating.ts` + methodology
- [x] **Match-level stats + cron soccer**: `PlayerMatchStat`, `/api/cron/soccer` (últimos 2 dias), backfill CLI (`data:backfill-boxscores` / `data:backfill-big5`)

## 🔜 Curto prazo (produção mínima viável)

- [ ] **Autenticação real com Supabase Auth**: trocar `src/lib/auth/session.ts` por
      `@supabase/ssr`, com login por e-mail/senha e OAuth (Google/Microsoft).
- [ ] **Roles e permissões**: usar o campo `role` (`ADMIN`, `SCOUT`, `ANALYST`,
      `VIEWER`) do schema para restringir ações (ex.: só `ADMIN`/`SCOUT` podem gerar
      relatórios de IA).
- [ ] **Persistência de scouting reports**: salvar relatórios gerados em
      `scouting_reports` (hoje ficam em memória por sessão de servidor).
- [ ] **Shortlist / notes por usuário (DB)**: migrar tags + notes de localStorage para conta autenticada.

## 🚀 Médio prazo

- [ ] **IA real para scout reports**: substituir / reforçar `src/lib/ai/scout-report-generator.ts`
      com Anthropic quando `ANTHROPIC_API_KEY` estiver disponível (hoje: OpenRouter / mock).
- [ ] **Dados reais de competições**: integração com um provedor de dados esportivos
      (ex. Opta, StatsPerform, API-Football) para substituir os dados fictícios.
- [ ] **Notificações**: alertas de mudança de rating/valor de mercado de jogadores
      monitorados (watchlist).
- [ ] **Multi-tenant**: isolar dados por clube/organização (campo `organizationId`
      nas tabelas principais).
- [ ] **Internacionalização (i18n)**: UI padrão em inglês; preparar next-intl se precisar
      de pt/es.

## 🌍 Longo prazo

- [ ] **Vídeo scouting**: anexar clipes de vídeo por jogador/evento (integração com
      Hudl-like storage).
- [ ] **Modelos preditivos**: projeção de evolução de performance e valor de mercado
      usando séries históricas.
- [ ] **Mapas de calor e eventos em campo**: visualizações espaciais (shots map,
      passing network) a partir de dados de eventos (StatsBomb open data como fonte
      inicial).
- [ ] **Comparação multi-jogador (3+)**: expandir `/compare` para múltiplos jogadores
      simultâneos.
- [ ] **API pública**: expor endpoints REST/GraphQL para integrações de terceiros
      (agências, clubes parceiros).
- [ ] **Mobile app**: versão nativa ou PWA para uso em campo por scouts.

## 🧹 Débito técnico conhecido

- Componentes `ui/*` seguem o padrão visual do Shadcn UI mas foram escritos à mão
  (sem o CLI oficial) para reduzir dependências externas — migrar para o CLI oficial
  se o time preferir manter atualizações automáticas de tema.
- Não há testes de acessibilidade (a11y) automatizados ainda — os componentes usam
  contraste AA no dark mode, mas falta auditoria com axe-core/Lighthouse CI.
- `player.repository.prisma.ts` ainda concentra list/query + mappers — ver split em
  `docs/SOCCER-SCOUT-PLAN.md` (refactor track).
- Hubs Basketball / American Football: **manter estáveis; não expandir** enquanto o
  fluxo soccer-first não estiver “good enough”.

## Plano de execução scout

Ver **`docs/SOCCER-SCOUT-PLAN.md`** (Stages 0–7 done locally).

### Ops — dados de appearances (Big-5)

```bash
# Histórico (off-season: use --end in-season)
npm run data:backfill-big5 -- --days=35 --end=2026-05-25

# Uma liga
npm run data:backfill-boxscores -- --days=30 --slug=esp.1 --end=2026-05-25

# Cron local (mesma janela de 2 dias que /api/cron/soccer)
npm run data:cron-sync-2026
```

Vercel: `vercel.json` agenda `GET /api/cron/soccer` diariamente — exige `CRON_SECRET`.
