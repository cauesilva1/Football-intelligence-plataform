# OmniScout — Intelligence Playbook

> **Branch de trabalho:** `experiments`  
> **Referência de produto:** evoluir de dashboard multi-sport para **Sports Intelligence Platform**  
> **Referência de UI/UX (quando chegar a fase visual):** [Stats Perform](https://www.statsperform.com/) — confiança, dados como verdade, B2B profissional  
> **Foco inicial:** Soccer (inteligência profunda); arquitetura permanece multi-sport

> **Ordem de construção (decisão 2026-07-27):** **headless first, UI por último.**  
> Engine → testes → queries/integração → export/CLI → **só então** componentes visuais.

Use este arquivo como guia único. Marque `[x]` conforme for concluindo cada item.

---

## 1. Visão de produto

### O que NÃO somos
- Outro banco de estatísticas tipo Sofascore/Transfermarkt
- Chatbot genérico que repete números
- Produto com um único “Overall Rating” opaco

### O que SOMOS (alvo)
```
DADOS BRUTOS (ESPN, API-Football, Transfermarkt)
        ↓
FEATURE ENGINEERING (per90, percentis, scorecards)
        ↓
MODELOS DE INTELIGÊNCIA POR ESPORTE (soccer first)
        ↓
SINAIS INTERPRETÁVEIS (role, style, trajectory, fit…)
        ↓
PERFIL DE INTELIGÊNCIA + EVIDÊNCIA
        ↓
CONTEXTO HISTÓRICO (seasons, appearances, similar players)
        ↓
RECOMENDAÇÃO (decision support, não certeza)
```

### Perguntas que o produto deve responder (futuro)
- [ ] Quem substitui este jogador que está saindo?
- [ ] Quem está subvalorizado vs performance?
- [ ] Quem melhora mais rápido que pares da mesma idade?
- [ ] Quem tem perfil similar ao alvo?
- [ ] Quem encaixa no estilo tático do clube?
- [ ] Quais os riscos de contratar X?
- [ ] **Por quê** cada recomendação foi feita?

### Princípio inegociável
> Toda score deve ter **evidência visível** e **limitações declaradas** (amostra pequena, dados defensivos ausentes, liga fraca).

---

## 2. UI/UX — inspiração Stats Perform

Referência: [statsperform.com](https://www.statsperform.com/)

### O que a Stats Perform faz bem (e por quê copiar a *lógica*, não o site inteiro)

| Stats Perform | Tradução para OmniScout |
|---------------|-------------------------|
| **“Truth starts with Opta”** — marca de confiança | **“Intelligence starts with honest data”** — metodologia visível em todo score |
| Dados como **autoridade**, não decoração | Números com fonte, sample size, link para `/methodology` |
| Segmentação clara por audiência (Teams, Media, Broadcasters…) | Segmentação por **workflow scout**: Discover → Shortlist → Compare → Report |
| Produtos em camadas (Data → Performance → AI) | Camadas: **Browse** → **Intelligence** → **Decision** |
| Visual premium B2B, tipografia forte, muito espaço | Manter `font-display` para títulos, `font-mono` para stats, painéis densos mas legíveis |
| Storytelling com dados (“30 years of innovation”) | Storytelling com **trajectory** e **evidence panels** no perfil |
| “When sport needs the right answer, it needs the right data” | Empty states honestos; nunca parecer quebrado quando dado não existe |

### Diretrizes visuais OmniScout (Stats Perform–inspired)

#### Tom visual
- [ ] **Profissional / analítico** — parecer ferramenta de clube, não app de fan
- [ ] **Escuro como base** — fundo `surface`/`card`; acentos por sport (`sport-theme`)
- [ ] **Hierarquia clara:** headline (`font-display`) → label uppercase tracking → valor mono tabular
- [ ] **Densidade controlada:** tabelas densas para scouts; respiro nos painéis de insight
- [ ] **Confiança antes de flair:** badges “Small sample”, “Provisional”, “Data gap” visíveis (como Opta = trust)

#### Padrões de componente (alinhar ao existente)
| Padrão | Uso | Arquivo de referência |
|--------|-----|----------------------|
| `DataPanel` | Blocos de inteligência com título + descrição | `src/components/data/data-panel.tsx` |
| `MetricCard` | KPI único com label | `src/components/data/metric-card.tsx` |
| Scorecard band | Rating + role metrics assimétricos | `player-performance-section.tsx` |
| `GlossaryTooltip` | Explicar métrica sem poluir UI | `glossary-copy.ts` |
| `ScoutWorkflowNav` | Trilha Discover → Report | `scout-workflow-nav.tsx` |
| Badge amber | Amostra pequena / provisório | já usado em listas e perfil |

#### Layout por página (alvo)

**Dashboard / Overview**
- [ ] Hero curto: sport + season + “reference workflow” copy (soccer)
- [ ] Grid 2×2 de insights (já parcial) — estilo “metric cards” Stats Perform
- [ ] Seção “Market Opportunities” com honestidade de cobertura (Cap Hit só NBA/NFL)

**Scouting / Players**
- [ ] Scouting = intelligence defaults; Players = browse (já feito Stage 2)
- [ ] Filtros como “ferramenta pro”, não formulário genérico
- [ ] Colunas role-aware (Def/90 em ranking de defensores, etc.)

**Player Profile — futuro Intelligence Panel**
```
┌─────────────────────────────────────────────────────────┐
│ HEADER: nome, clube, posição, foto, season selector      │
├─────────────────────────────────────────────────────────┤
│ INTELLIGENCE BAND (novo)                                 │
│  Role label    │  Dimensão 1  │  Dim 2  │  Dim 3  │ Trajectory │
│  + confidence  │  + evidence  │  ...    │  ...    │  spark/label │
├─────────────────────────────────────────────────────────┤
│ SCORECARD (existente) │  Radar / Season chart           │
├─────────────────────────────────────────────────────────┤
│ Similar players (+ WHY) │  Recent appearances           │
├─────────────────────────────────────────────────────────┤
│ Scout notes │  Generate brief                          │
└─────────────────────────────────────────────────────────┘
```

**Compare**
- [ ] Side-by-side role packs (já parcial)
- [ ] Destacar divergência com cor semântica (primary / negative)

**Reports / Brief**
- [ ] One-pager PDF staff-ready (feito Stage 4)
- [ ] Key rates do scorecard, não metadata fake

**Methodology**
- [ ] Página como “Opta trust page” — fórmulas, floors, limitações
- [ ] Linkar de todo score na UI

#### Microcopy (tom Stats Perform)
- ✅ “Provisional rating — fewer than 450′”
- ✅ “Defensive data not supplied for this match”
- ✅ “Decision support — not a prediction”
- ❌ “AI says sign him”
- ❌ “Overall 8.4” sem contexto

#### O que NÃO copiar da Stats Perform
- Site marketing pesado (nós somos app, não landing B2B enterprise)
- Segmentação por indústria na nav principal
- Complexidade de produto Opta Vision / streaming (fora de escopo)

---

## 3. Estado atual do codebase (baseline)

> Auditoria em `experiments` @ `main` — Stages 0–7 soccer + Stage 8 data mergeados.

### Classificação honesta
**Hoje: entre dashboard (B) e produto de inteligência (C)** — ~65% do caminho.

### Já implementado ✅
- [x] Multi-sport: Soccer, NBA, NCAA, EuroLeague, NFL, CFB
- [x] ~3.550 jogadores / 169 clubes (soccer) em produção
- [x] Ingestão ESPN + crons + backfill CLI
- [x] API-Football: enrich defensivo, team apiSportsId
- [x] Rating soccer unificado + small sample honesty
- [x] Position scorecards (ATT/MID/DEF/GK + BB/AF)
- [x] Workflow: Scouting → Shortlist → Compare → Report
- [x] Similar players (weighted, position group)
- [x] Scout brief PDF + rating alinhado ao perfil
- [x] PlayerMatchStat + recent appearances
- [x] Rankings curados (U23, finishers, hidden gems, defenders…)
- [x] Metodologia documentada (`SCORING.md`, `/methodology`)

### Parcial ⚠️
- [ ] Shortlist/notes — só localStorage (device)
- [ ] Reports — file store, não tabela `scouting_reports`
- [ ] Auth — schema `User` existe, UI não
- [ ] Defensive data — depende enrich + quota API-Football
- [ ] Appearances vazias até cron/backfill
- [ ] Similar players — sem explicação “why” na UI
- [ ] AI — LLM para narrativa; sem RAG/memória

### Ausente ❌
- [ ] Player Intelligence Profile (multi-score + evidence)
- [ ] Performance trajectory panel
- [ ] Recruitment Search
- [ ] Team / Tactical Fit
- [ ] Historical memory / outcomes
- [ ] Player graph persistido

### Débito técnico (não bloquear MVP, mas registrar)
- [ ] `player.repository.prisma.ts` (~968 LOC) — split list vs sync
- [ ] `DATA_SOURCE=mock` default — demo vs prod
- [ ] Testes só em scoring/export — sem E2E
- [ ] BB/AF expandir só depois soccer intelligence maduro

---

## 4. Arquitetura alvo

### Core compartilhado (multi-sport)
```
Platform Core
├── Auth & Users (fase 5)
├── SportRegistry + cookie sport
├── Repository (Player, Team, Dashboard)
├── FilterEngine + URL sync
├── Compare, Export (PDF/txt)
├── WorkflowNav
├── Visualization (Recharts, tables)
└── Cron / ingestion infrastructure
```

### Inteligência por esporte
```
SportIntelligenceEngine (interface)
├── SoccerIntelligenceEngine   ← implementar primeiro
├── BasketballIntelligenceEngine
└── AmericanFootballIntelligenceEngine
```

### Contrato conceitual (TypeScript futuro)
```typescript
interface IntelligenceDimension {
  key: string;           // "production" | "creation" | "defense" | "trajectory"
  label: string;
  score: number;         // 0–100
  confidence: number;      // 0–1
  evidence: { label: string; value: string }[];
}

interface PlayerIntelligenceProfile {
  playerId: string;
  sport: "SOCCER" | "BASKETBALL" | "AMERICAN_FOOTBALL";
  season: string;
  role: string;
  styleLabel: string;
  styleTraits: string[];
  dimensions: IntelligenceDimension[];
  trajectory: "improving" | "stable" | "declining" | "insufficient_data";
  limitations: string[];
  comparables: { playerId: string; score: number; why: string[] }[];
}
```

### Persistência futura (proposta — não implementar ainda)
| Tabela | Propósito |
|--------|-----------|
| `player_intelligence_snapshots` | Scores + evidence por season |
| `recruitment_briefs` | Pedido do usuário + resultados |
| `shortlist_entries` | Substituir localStorage |
| `recruitment_outcomes` | Fase comercial — acerto/erro |

---

## 5. Inteligência Soccer — dimensões v1

| Dimensão | Dados | Método | ML? | Viável agora? |
|----------|-------|--------|-----|---------------|
| **Role** | posição, G/A, key passes, tackles | Regras + percentis | Não | ✅ |
| **Style** | radar per90 | `derivePlayingStyle` + labels | Não | ✅ parcial |
| **Production** | G/90, xG/90, rating | Normalização + scorecard | Não | ✅ |
| **Creation** | assists, key passes | per90 + percentil | Não | ✅ |
| **Defense** | tackles, ints | per90 quando disponível | Não | ⚠️ enrich |
| **Trajectory** | 2+ seasons | slope rating/G90 | Não | ✅ se history |
| **Similarity** | feature vector | weighted cosine | Não | ✅ + why |
| **Recruitment fit** | brief + features | weighted match | Não | Fase 3 |
| **Tactical fit** | team style | — | — | Fase 4 (sem team model) |

**LLM:** apenas narrativa em Reports — **nunca** inventar scores.

---

## 6. Roadmap — o que fazer e em que ordem

### Princípio: headless first

```
1. Types + engine (funções puras, testáveis)
2. Similarity “why” + trajectory (ainda sem UI)
3. Query layer / server integration (profile disponível no server)
4. Export / brief / CLI debug (validar output antes de pintar tela)
5. Percentis de liga (scores relativos)
6. Recruitment engine (fit score headless)
7. UI por último — um bloco coeso quando a inteligência estiver sólida
```

A UI existente (scorecards, workflow, brief PDF) **permanece**; não refatorar visual até a camada nova estar pronta.

---

### PHASE 0 — Baseline concluído ✅
Referência: `docs/SOCCER-SCOUT-PLAN.md` Stages 0–7 + Stage 8 data.

- [x] Credibilidade de rating
- [x] Scout workflow UI
- [x] Role scorecards
- [x] Staff brief PDF
- [x] Branches limpas (`main` + `experiments`)

---

### PHASE 1 — Intelligence Profile MVP (soccer, headless)
**Objetivo:** perfil estruturado gerado no server — testável sem abrir o browser.  
**Branch:** `experiments`  
**Estimativa:** 3–5 semanas (UI fora desta fase)

#### 1.1 Engine + types
- [ ] Criar `src/lib/intelligence/soccer/`
  - [ ] `types.ts` — `PlayerIntelligenceProfile`, `IntelligenceDimension`, etc.
  - [ ] `build-soccer-intelligence-profile.ts` — orquestrador
  - [ ] `classify-soccer-role.ts` — labels (Progressive Playmaker, Ball-winning CB…)
  - [ ] `compute-soccer-dimensions.ts` — 4 dimensões + confidence + evidence
  - [ ] `compute-soccer-trajectory.ts` — improving/stable/declining/insufficient_data
  - [ ] `explain-similarity.ts` — top 3 razões de similaridade
- [ ] Testes unitários (`*.test.ts`) — ST, CB, CM small sample

#### 1.2 Integração server (sem componentes React)
- [ ] `queryPlayerIntelligenceProfile(playerId)` em `src/features/scouting/queries/`
- [ ] Estender `similar-players.ts` para incluir `why[]`
- [ ] Wire em `scout-report-generator` / `scout-brief-context` (evidence alinhada)
- [ ] Script CLI opcional: `npm run intel:profile -- <playerId>` (debug/output JSON)

#### 1.3 Critério de done (headless)
- [ ] `buildSoccerIntelligenceProfile(player)` retorna JSON consistente
- [ ] ST vs CB → role e dimensões diferentes no objeto
- [ ] Jogador <450′ → `confidence` baixa + `limitations` explícitas
- [ ] Similar retorna `why` com 3 strings
- [ ] `tsc` + `npm test` verdes
- [ ] **Nenhum componente UI novo nesta fase**

**Arquivos prováveis (fase headless):**
- `src/lib/intelligence/soccer/*.ts` (novo)
- `src/features/scouting/queries/player-intelligence.ts` (novo)
- `src/features/scouting/lib/similarity.ts` (estender)
- `src/lib/export/scout-brief-context.ts` (estender)
- `src/scripts/print-intelligence-profile.ts` (opcional)

---

### PHASE 1b — Percentis e contexto de liga (antes da UI)
**Objetivo:** scores relativos ao universo (não absolutos).  
**Estimativa:** 2–3 semanas

- [ ] `computeLeaguePositionPercentiles(sport, league, position)`
- [ ] Cache em memória ou `SystemCache` por season
- [ ] Dimensões usam percentil → score 0–100
- [ ] Testes + output JSON (ainda sem UI)

---

### PHASE 1c — Recruitment engine (headless, antes da UI)
**Objetivo:** fit score + ranked list como dados, não como tela.  
**Estimativa:** 2–3 semanas

- [ ] `RecruitmentBrief` type
- [ ] `scoreRecruitmentFit(brief, player)` — heurístico
- [ ] `queryRecruitmentCandidates(brief)` — reusa filter + intelligence
- [ ] Testes + CLI debug
- [ ] Copy/modelo: “Decision support, not certainty” nos **dados**, UI depois

---

### PHASE 2 — UI Intelligence Layer (por último)
**Objetivo:** apresentar o que já funciona no server — Stats Perform–inspired.  
**Estimativa:** 2 semanas — **só após Phase 1 + 1b (+ 1c se priorizado)**

#### 2.1 Player profile
- [ ] `PlayerIntelligencePanel` — consome `queryPlayerIntelligenceProfile`
- [ ] Band: Role + Trajectory + confidence
- [ ] Grid dimensões + evidence + limitations
- [ ] Link → `/methodology`

#### 2.2 Surfaces existentes
- [ ] `PlayerSimilarSection` — coluna “Why similar”
- [ ] Brief PDF — intelligence dimensions quando existirem
- [ ] (Opcional) `/recruitment` — form + ranked list

#### 2.3 Critério de done (UI)
- [ ] Perfil ST vs CB muda visualmente **espelhando** o JSON já validado
- [ ] UI nunca calcula score — só renderiza server output

**Arquivos prováveis (fase UI):**
- `src/features/scouting/components/profile/player-intelligence-panel.tsx` (novo)
- `src/features/scouting/components/profile/player-similar-section.tsx`
- `src/features/scouting/components/player-profile-view.tsx`

---

### PHASE 2 (legado renumerado) — ~~Percentis~~ → ver Phase 1b

### PHASE 3 (legado renumerado) — ~~Recruitment UI~~ → engine em 1c, UI em Phase 2

---

### PHASE 3 — Team / Tactical Fit
**Estimativa:** 6+ semanas — **só depois** de validar Phase 1–3

- [ ] `TeamStyleProfile` (pressing, possession proxy from TeamStatistic)
- [ ] `computeTacticalFit(teamId, playerId)`
- [ ] UI no perfil: “Fit for [Club X]: 74%”

---

### PHASE 5 — Memory, Auth, Outcomes
**Estimativa:** 8+ semanas

- [ ] Auth (NextAuth ou similar) + roles SCOUT/ANALYST
- [ ] Shortlist + notes em DB
- [ ] Reports em `scouting_reports` Prisma
- [ ] Histórico de recruitment briefs
- [ ] RAG opcional sobre notas do clube (só se agregar valor)
- [ ] `RecruitmentOutcome` para aprendizado comercial

---

### PHASE 6 — Comercial
- [ ] Multi-tenant / org
- [ ] API pública
- [ ] White-label reports
- [ ] Pricing para clubes, agências, academias

---

## 7. O que NÃO construir (ainda)

| Item | Por quê |
|------|---------|
| Chatbot “pergunte sobre o jogador” | Não é diferenciador; vira wrapper de stats |
| ML / embeddings antes de rules+percentis | Dados e labels ainda imaturos |
| Team fit sem team model | Score fake destrói confiança |
| Auth enterprise antes de 2–3 usuários reais | Overhead |
| Expandir BB/AF intelligence antes soccer | Dispersão |
| Event-level xG chain / tracking | Sem feed; anos de trabalho |
| Competir com Opta/Stats Perform em dados | Eles vendem **feed**; nós vendemos **decision layer** |

**Posicionamento vs [Stats Perform](https://www.statsperform.com/):**  
Eles são infraestrutura de dados + AI em escala enterprise. OmniScout é **workflow de scout + inteligência interpretável** para clubes menores, analistas independentes e academias — com honestidade de amostra que produtos grandes muitas vezes omitem na UI.

---

## 8. Checklist semanal sugerido (experiments) — headless first

### Semana 1 — Engine
- [ ] Scaffold `src/lib/intelligence/soccer/` + types
- [ ] `buildSoccerIntelligenceProfile(player)`
- [ ] Testes: ST, CB, CM small sample

### Semana 2 — Engine completa
- [ ] Dimensions + trajectory + limitations
- [ ] `explain-similarity` integrado em `similarity.ts`
- [ ] Testes de regressão

### Semana 3 — Server integration
- [ ] `queryPlayerIntelligenceProfile`
- [ ] Alinhar `scout-brief-context` com intelligence
- [ ] CLI `intel:profile` para inspecionar JSON no terminal

### Semana 4 — Percentis (Phase 1b)
- [ ] League/position percentiles
- [ ] Dimensões relativas + testes

### Semana 5–6 — Recruitment engine (Phase 1c, opcional antes da UI)
- [ ] `scoreRecruitmentFit` + query headless + testes

### Semana 7+ — UI (Phase 2) — **somente quando headless estiver estável**
- [ ] `PlayerIntelligencePanel`
- [ ] Similar “why” na tela
- [ ] Review visual Stats Perform
- [ ] Merge `experiments` → `main`

---

## 9. Mapa de arquivos do repo (referência rápida)

| Área | Path |
|------|------|
| Rotas | `src/app/` |
| Scouting UI | `src/features/scouting/` |
| Scorecards | `src/features/scouting/lib/position-scorecard.ts` |
| Similarity | `src/features/scouting/lib/similarity.ts` |
| Rating soccer | `src/lib/scoring/soccer-rating.ts` |
| Reports AI | `src/lib/ai/scout-report-generator.ts` |
| PDF brief | `src/lib/export/scout-brief-*.ts` |
| Schema | `prisma/schema.prisma` |
| Crons | `src/app/api/cron/` |
| Data scripts | `package.json` → `data:*` |
| Soccer plan (histórico) | `docs/SOCCER-SCOUT-PLAN.md` |
| Scoring docs | `docs/SCORING.md` |
| **Este playbook** | `docs/OMNISCOUT-INTELLIGENCE-PLAYBOOK.md` |

---

## 10. Respostas finais (decisão estratégica)

| # | Pergunta | Resposta |
|---|----------|----------|
| 1 | Continuar OmniScout? | **Sim** |
| 2 | Novo projeto? | **Não** |
| 3 | Próximo build? | **Engine soccer headless** (Phase 1) — UI na Phase 2 |
| 4 | Não construir? | Chatbot, ML pesado, team fit cedo, **UI antes da engine** |
| 5 | Viável com codebase? | **Sim** — 80% da infra já existe |
| 6 | Diferenciação? | Explainable intelligence + scout workflow + honest sample |
| 7 | 1ª feature útil para scout real? | **JSON/profile confiável no server** — UI só espelha depois |

---

## 11. Como usar este documento

1. Trabalhe na branch **`experiments`** para ideias novas.
2. Marque `[x]` nos checklists conforme avança.
3. Quando uma fase estiver estável → PR `experiments` → `main`.
4. Atualize este arquivo quando decisões mudarem (data + nota no topo).
5. Para detalhes históricos do soccer workflow, veja `SOCCER-SCOUT-PLAN.md`.

---

*Última atualização: 2026-07-27 — headless-first: UI movida para Phase 2; engine antes de componentes visuais.*
