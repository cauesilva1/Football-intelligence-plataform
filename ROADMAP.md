# 🗺️ Roadmap — Football Intelligence Platform

Este documento lista o que falta para levar o produto de **~90% funcional (mock)**
para **produção real**, organizado por prioridade.

## 🔜 Curto prazo (produção mínima viável)

- [x] **UI em inglês** (labels de scouting/torneios; Brasileirão/La Liga como nomes próprios)
- [x] **Rankings U23 / Hidden Gems** alinhados ao dashboard (≥ 450', value score)
- [x] **Copa do Mundo no DB** com seed de seleções nacionais + hub preferindo Match saudável
- [ ] **Autenticação real com Supabase Auth**: trocar `src/lib/auth/session.ts` por
      `@supabase/ssr`, com login por e-mail/senha e OAuth (Google/Microsoft).
- [ ] **Roles e permissões**: usar o campo `role` (`ADMIN`, `SCOUT`, `ANALYST`,
      `VIEWER`) do schema para restringir ações (ex.: só `ADMIN`/`SCOUT` podem gerar
      relatórios de IA).
- [ ] **Persistência de scouting reports**: salvar relatórios gerados em
      `scouting_reports` (hoje ficam em memória por sessão de servidor).
- [x] **Testes automatizados (scoring)**: unit tests para `per90` e `soccer-rankings`
- [ ] **Paginação e filtros no servidor com querystring**: sincronizar filtros de
      `/players` e `/scouting` com a URL para permitir compartilhamento de links.

## 🚀 Médio prazo

- [ ] **IA real para scout reports**: substituir `src/lib/ai/scout-report-generator.ts`
      por uma chamada à API da Anthropic (a variável `ANTHROPIC_API_KEY` já está
      reservada no `.env.example`), incluindo prompt estruturado com os dados do
      jogador e formatação de saída em JSON.
- [ ] **Dados reais de competições**: integração com um provedor de dados esportivos
      (ex. Opta, StatsPerform, API-Football) para substituir os dados fictícios.
- [ ] **Exportação de relatórios**: gerar PDF do scout report (botão "Exportar" já
      presente na UI, aguardando implementação).
- [ ] **Notificações**: alertas de mudança de rating/valor de mercado de jogadores
      monitorados (watchlist).
- [ ] **Watchlist / Shortlist de scouting**: permitir salvar jogadores favoritos por
      usuário, com anotações.
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
- `src/lib/comparison-analysis.ts` usa regras determinísticas simples; pode evoluir
  para um modelo estatístico ponderado por posição.
- Não há testes de acessibilidade (a11y) automatizados ainda — os componentes usam
  contraste AA no dark mode, mas falta auditoria com axe-core/Lighthouse CI.
