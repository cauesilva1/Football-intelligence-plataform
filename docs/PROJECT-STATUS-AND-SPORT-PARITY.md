# OmniScout — Estado do projeto e parity multi-sport

> **Data:** 2026-07-27  
> **Branch:** `experiments`  
> **Documento irmão:** `docs/OMNISCOUT-INTELLIGENCE-PLAYBOOK.md`  
> **Objetivo:** resumo completo de onde o projeto está hoje, e o que falta para basketball e American football chegarem ao **mesmo nível de profundidade** que soccer — sem vender OmniScout como “app de futebol”.

---

## 1. O que é o OmniScout

OmniScout é uma **Sports Intelligence Platform** multi-sport: camada de decisão para scouts (evidence + limitações declaradas), não um Sofascore/Transfermarkt e não um feed Opta.

**Esportes first-class (pares):**

| Sport | Tagline | Ligas / contexto |
|-------|---------|------------------|
| Soccer | Pitch Intelligence | Big5, Brasileirão, MLS, etc. |
| Basketball | Court Intelligence | NBA, NCAA, EuroLeague |
| American Football | Gridiron Intelligence | NFL, College Football (CFB) |

**Regra de posicionamento:** na landing, demos e pitch, os três são **iguais**. Soccer pioneirou o *template* de engine profunda e testes; BB/AF sobem em **paralelo** no mesmo nível de produto — não são extras.

---

## 2. Como o projeto está hoje (visão geral)

### Classificação honesta

Desk compartilhado maduro nos três esportes; **engines de intelligence** (role, percentis, recruitment, tactical) nos três via Waves 1–4. **Profundidade de dados** (multi-season / EuroLeague stats) ainda limita trajectory em BB/AF — ver `docs/DATA-COVERAGE.md`.

### Stack e superfície

- Next.js app + Prisma + SportRegistry (cookie de sport)
- Landing pública em `/` (Phase M) — multi-sport peers
- App em `/dashboard`, `/scouting`, `/players`, `/rankings`, `/shortlist`, `/compare`, `/recruitment`, `/reports`, `/methodology`, `/teams`, …

### Fases recentes (2026-07)

| Phase | Estado | Notas |
|-------|--------|-------|
| 1 / 1b / 1c | ✅ Soccer | Intelligence profile, percentis, recruitment headless |
| 2 | ✅ Soccer UI | Painel intelligence, “why” similarity, `/recruitment` |
| 3 | ✅ Soccer MVP | Tactical / team fit |
| 5a | ✅ | Workspace anônimo (`deviceId` + cookie) — shortlist / reports / recruitment history |
| 5b | ⏸ | Auth invite-only — só com piloto |
| 6 | ⏸ | Comercial / multi-tenant — adiado até piloto real |
| M | ✅ | Landing multi-sport + polish |

**Não há signup público.** Acesso: explorar o produto + Contact / Request access (mailto).

---

## 3. O que já é compartilhado (os três esportes)

Isto é o **shared desk** — funcional hoje para Soccer, Basketball e American Football:

- Sport switcher + filtros + listas de scouting
- Ratings honestos com floors de amostra (`soccer-rating`, `basketball-rating`, `football-rating`)
- Position scorecards (ATT/MID/DEF/GK · Guard/Wing/Big · QB/Skill/Defense/OL/…)
- Similarity ponderada por sport
- Shortlist, Compare, Scout brief / reports (PDF)
- Dashboard, rankings (presets; soccer ainda tem mais curadoria dedicada)
- Ingestão ESPN + crons por sport (`/api/cron/soccer|basketball|american-football`)
- Docs de parity de desk/data: `BASKETBALL-SCOUT-PARITY.md`, `AMERICAN-FOOTBALL-SCOUT-PARITY.md`
- Metodologia de scoring em `SCORING.md` + `/methodology`

**Conclusão:** quem abre o app e troca de sport já tem um **workflow de scout**. O que falta para “mesmo nível do soccer” é a **camada de inteligência interpretável**, não o shell.

---

## 4. Maturidade por esporte (comparativo)

| Dimensão | Soccer | Basketball | American Football |
|----------|--------|------------|-------------------|
| Ingestão / cron | ✅ ESPN + API-Football (defensivo) | ✅ ESPN + EuroLeague | ✅ ESPN NFL/CFB |
| Contagem documentada | ~3 921 jogadores | ~2 320 (NBA/NCAA/EL) — `DATA-COVERAGE.md` | ~9 792 (NFL+CFB) — `DATA-COVERAGE.md` |
| Rating + honesty | ✅ | ✅ | ✅ |
| Scorecards | ✅ | ✅ | ✅ |
| Shared desk (list/compare/shortlist/report) | ✅ | ✅ | ✅ |
| **Intelligence profile** (role, dimensions, trajectory, limits) | ✅ `src/lib/intelligence/soccer/` | ✅ `src/lib/intelligence/basketball/` | ✅ `src/lib/intelligence/american-football/` |
| **Percentis de liga/posição** | ✅ | ✅ (NBA/NCAA/EuroLeague isolados) | ✅ (NFL/CFB isolados) |
| **Recruitment fit engine** | ✅ + UI `/recruitment` | ✅ + UI sport-aware | ✅ + UI sport-aware |
| **Tactical / team fit** | ✅ MVP + panel | ✅ MVP + panel | ✅ MVP + panel |
| **Similarity “why”** | ✅ | ✅ | ✅ |
| Painéis no perfil | Intelligence + Tactical | Intelligence + Tactical | Intelligence + Tactical |
| Data depth / honesty badges | ✅ + `data:coverage` | ✅ (trajectory rare until backfill) | ✅ (trajectory rare until backfill) |
| Testes de intelligence | 4 suítes | 3 suítes | 3 suítes |
| Testes de scoring | ✅ | ✅ | ✅ |
| CLI intel / coverage | ✅ `intel:*` + `data:coverage` | ✅ via registry + coverage | ✅ via registry + coverage |

### Onde ainda há gap (data, não engine)

- EuroLeague: rostos sem season stats (`data:sync-euroleague`)
- BB/AF: ~0% trajectory-eligible até backfill multi-season
- Ver `docs/DATA-COVERAGE.md` e `npm run data:coverage`

---

## 5. O que o soccer tem de “depth” (template a portar)

Tudo sob `src/lib/intelligence/soccer/`:

| Módulo | Papel |
|--------|--------|
| `build-soccer-intelligence-profile.ts` | Orquestra o perfil |
| `classify-soccer-role.ts` | Labels de papel (ex.: Clinical Finisher) |
| `compute-soccer-dimensions.ts` (+ raw scores) | Dimensões 0–100 + evidência |
| `compute-soccer-trajectory.ts` | Improving / stable / declining / insufficient |
| `league-percentiles.ts` | Cohort liga × posição |
| `explain-similarity.ts` | “Why” dos comparáveis |
| `score-recruitment-fit.ts` + `recruitment-types.ts` | Ranked fit para o brief |
| `team-style-profile.ts` + `compute-tactical-fit.ts` | Fit tático heurístico |
| `*.test.ts` | Suite de regressão |

UI / queries que consomem isso: `player-intelligence-panel`, `player-tactical-fit-panel`, recruitment page, brief snapshot, CLIs.

---

## 6. O que precisa para BB e AF ficarem no mesmo nível do soccer

Ordem alinhada ao playbook: **headless → testes → queries/CLI → UI → data depth**.

### 6.1 Engines headless (prioridade 1)

Espelhar o template soccer:

1. **`src/lib/intelligence/basketball/`**
   - Profile builder, role classifier, dimensions (scoring / playmaking / defense / rebounding…), trajectory
   - Percentis por liga (NBA / NCAA / EuroLeague) × posição
   - Explain similarity (já existe feature vector BB em similarity)
   - Recruitment fit nativo (posições Guard/Wing/Big, constraints de idade/liga)
   - Depois: team style + tactical fit (pace / offense / defense proxies)

2. **`src/lib/intelligence/american-football/`**
   - Mesmo esqueleto; dimensões por grupo (QB / Skill / Defense / OL / Specialist)
   - Percentis NFL vs CFB × posição
   - Recruitment (draft/age/contexto)
   - Tactical fit (esquema) — MVP heurístico depois do profile estável

3. **Contrato compartilhado (recomendado)**  
   `src/lib/intelligence/types.ts` + dispatcher `getIntelligenceEngine(sport)` para a UI não ficar cheia de `if (soccer)`.

### 6.2 Testes (prioridade 2)

Portar o padrão das 4 suítes soccer para cada sport (role tipico, small sample, ranking de fit, tactical). Meta: `npm test` cobre peers.

### 6.3 Queries / CLI (prioridade 3)

- Remover gates soccer-only em `player-intelligence` e `recruitment-candidates`
- Percentis por sport
- CLIs `intel:*` com `--sport=`
- Brief / report snapshot de intelligence para BB/AF

### 6.4 UI (prioridade 4)

- Painéis intelligence + tactical no perfil BB/AF
- Form de recruitment com posições/filtros do sport ativo
- Coluna “Why” na similarity para BB/AF
- Landing já trata peers iguais — manter essa disciplina no app interno

### 6.5 Data depth (✅ Wave pós-parity — 2026-07-27)

| Sport | Estado |
|-------|--------|
| Contagens | Documentadas em `docs/DATA-COVERAGE.md` + CLI `npm run data:coverage` |
| Honesty floors | `src/lib/intelligence/data-depth.ts` alinhado a trajectory |
| UI badges | Header + intelligence panel |
| Basketball | EuroLeague still roster-only; NBA/NCAA mostly 1 productive season |
| American Football | NFL/CFB counts OK; multi-season backfill still ops work |

### Ordem de entrega (histórico Waves 1–4 + ponto 1)

1. ✅ BB Intelligence Profile + percentis + testes  
2. ✅ BB Recruitment + wire UI  
3. ✅ AF Intelligence Profile + percentis + testes  
4. ✅ AF Recruitment + wire UI  
5. ✅ BB then AF Tactical fit MVP  
6. ✅ Documentar cobertura + honesty badges (`DATA-COVERAGE.md`)

---

## 7. O que NÃO precisa “igualar” para parity de inteligência

- Replicar volume soccer (~3550) no dia 1 — precisa **profundidade de sinal** e honesty, não só volume
- Auth enterprise / Phase 6 comercial — adiado até piloto
- Competir com Opta em feed — fora de escopo; vendemos decision layer
- Chatbot genérico sobre o jogador

---

## 8. Débito e riscos a lembrar

- `player.repository.prisma.ts` grande — split list vs sync (**adiado**; não bloqueia demos)
- `DATA_SOURCE=mock` default — ver `docs/DEMO-DATA-SOURCE.md` antes de demos
- E2E browser completo adiado; smoke: `perf:routes` + fluxo manual recruitment replace
- Defensive soccer depende de quota API-Football
- Se a apresentação/demo privilegiar soccer, o mercado lê “app de futebol” — parity de **pitch + UI + engines** é produto, não só tech

---

## 9. Resumo executivo

| Camada | Soccer | Basketball | American Football |
|--------|--------|------------|-------------------|
| Shared scout desk | Pronto | Pronto | Pronto |
| Rating + scorecard | Pronto | Pronto | Pronto |
| Intelligence depth (engine) | Pronto | Pronto | Pronto |
| Data depth / trajectory sample | ~20% eligible | Engine ok; sample thin | Engine ok; sample thin |
| Marketing / landing | Peer | Peer | Peer |

**Hoje:** peers no desk **e** nas engines; BB/AF limitados por **dados multi-season**, não por código.  
**Roadmap 1–4:** ✅ data depth → ✅ decisão (replace/value) → ✅ polish → ✅ demo DATA_SOURCE docs.

---

*Atualizado 2026-07-27 (Waves 1–4 + data depth). Ver `docs/DATA-COVERAGE.md`.*
