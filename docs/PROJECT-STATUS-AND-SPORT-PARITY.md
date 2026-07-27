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

Entre **dashboard multi-sport** e **produto de inteligência**: desk compartilhado maduro nos três esportes; profundidade de intelligence (role, percentis, recruitment fit, tactical fit) **só em soccer**.

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
| Contagem documentada | ~3.550 jogadores / 169 clubes | Não enumerada no repo | Não enumerada no repo |
| Rating + honesty | ✅ | ✅ | ✅ |
| Scorecards | ✅ | ✅ | ✅ |
| Shared desk (list/compare/shortlist/report) | ✅ | ✅ | ✅ |
| **Intelligence profile** (role, dimensions, trajectory, limits) | ✅ `src/lib/intelligence/soccer/` | ✅ `src/lib/intelligence/basketball/` | ✅ `src/lib/intelligence/american-football/` |
| **Percentis de liga/posição** | ✅ | ✅ (NBA/NCAA/EuroLeague isolados) | ✅ (NFL/CFB isolados) |
| **Recruitment fit engine** | ✅ + UI `/recruitment` | ✅ + UI sport-aware | ✅ + UI sport-aware |
| **Tactical / team fit** | ✅ MVP + panel | ❌ | ❌ |
| **Similarity “why”** | ✅ | ✅ | ✅ |
| Painéis no perfil | Intelligence + Tactical | Intelligence | Intelligence |
| Testes de intelligence | 4 suítes | 2 suítes | 2 suítes |
| Testes de scoring | ✅ | ✅ | ✅ |
| CLI intel (`intel:profile` etc.) | ✅ soccer | — | — |

### Onde o código trava BB/AF (exemplos)

- `src/features/scouting/queries/player-intelligence.ts` — throw se sport ≠ SOCCER
- `src/features/scouting/queries/recruitment-candidates.ts` — engine soccer-only
- `src/features/scouting/components/player-profile-view.tsx` — painéis intelligence/tactical só se `isSoccer`
- Form de recruitment: posições tipicamente soccer
- Pasta `src/lib/intelligence/` contém **apenas** `soccer/`

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

### 6.5 Data depth (prioridade 5, em paralelo)

| Sport | Trabalho |
|-------|----------|
| Basketball | Cobertura EuroLeague consistente; documentar contagens; team aggregates para fit |
| American Football | Rosters/stats CFB consistentes; documentar contagens; multi-season para trajectory |
| Ambos | Histórico de seasons suficiente para trajectory não ser quase sempre `insufficient_data` |

### Ordem de entrega sugerida

1. BB Intelligence Profile + percentis + testes  
2. BB Recruitment + wire UI perfil/recruit  
3. AF Intelligence Profile + percentis + testes  
4. AF Recruitment + wire UI  
5. BB then AF Tactical fit MVP  
6. Documentar cobertura (player/team counts) + polish de honesty badges  

---

## 7. O que NÃO precisa “igualar” para parity de inteligência

- Replicar volume soccer (~3550) no dia 1 — precisa **profundidade de sinal** e honesty, não só volume
- Auth enterprise / Phase 6 comercial — adiado até piloto
- Competir com Opta em feed — fora de escopo; vendemos decision layer
- Chatbot genérico sobre o jogador

---

## 8. Débito e riscos a lembrar

- `player.repository.prisma.ts` grande — split list vs sync
- `DATA_SOURCE=mock` default — cuidado em demos
- Sem E2E
- Defensive soccer depende de quota API-Football
- Se a apresentação/demo privilegiar soccer, o mercado lê “app de futebol” — parity de **pitch + UI + engines** é produto, não só tech

---

## 9. Resumo executivo

| Camada | Soccer | Basketball | American Football |
|--------|--------|------------|-------------------|
| Shared scout desk | Pronto | Pronto | Pronto |
| Rating + scorecard | Pronto | Pronto | Pronto |
| Intelligence depth | **Referência** | Gap principal | Gap principal |
| Marketing / landing | Peer | Peer | Peer |

**Hoje:** multi-sport de verdade no workflow; soccer na frente só na *engine* profunda.  
**Próximo passo de parity:** portar `intelligence/soccer/` → `basketball/` e `american-football/`, abrir os gates nas queries/UI, e subir testes em paralelo — para o produto (e o pitch) não depender de um único esporte.

---

*Gerado em 2026-07-27. Atualizar este arquivo quando BB/AF ganharem engines ou quando contagens de cobertura forem documentadas.*
