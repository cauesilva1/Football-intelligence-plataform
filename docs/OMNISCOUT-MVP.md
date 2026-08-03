# OmniScout — MVP & narrativa de startup

> Sports Intelligence Platform para scouting multi-desporto.  
> Documento para apresentar o produto, o estado do MVP e o que vem a seguir.  
> Atualizado: agosto 2026 · branch `experiments`

---

## Em uma frase

**OmniScout** transforma dados públicos de futebol, basquete e futebol americano em inteligência de scouting acionável — com profundidade honesta, não dashboards de vaidade.

---

## O problema

Clubes, agentes e scouts lidam com o mesmo gap:

- Dados espalhados (feeds, PDFs, planilhas, “olho clínico” sem trilha).
- Plataformas caras ou fechadas demais para um time pequeno validar hipóteses rápido.
- Métricas que **parecem** cobertura total, mas escondem plantéis vazios, stubs e zeros.

O mercado não precisa de mais um painel bonito. Precisa de **confiança no dado** antes de confiar no score.

---

## A solução

OmniScout é uma plataforma de **Sports Intelligence** que:

1. **Ingere** jogos e temporadas a partir de feeds públicos (ESPN, API-Football e pipelines próprios).
2. **Normaliza** jogadores, clubes e estatísticas num modelo único (Postgres + Prisma).
3. **Pontua e contextualiza** (ratings, profundidade de amostra, elegibilidade de trajetória).
4. **Expõe** hubs de scouting por desporto — listas, perfis, metodologias transparentes.

Princípio de produto: **encher zeros reais**, não encolher denominadores para fabricar KPIs.

---

## Porquê agora

- Feeds públicos já permitem um MVP multi-liga sem contrato enterprise no dia 1.
- Scouting moderno exige **histórico de temporada** (trajetória), não só o último jogo.
- Startups e academias precisam de uma base séria antes de pagar Stacks/Wyscout-class.

OmniScout posiciona-se como a camada de inteligência **honesta e multi-desporto** — começando por soccer showcase e expandindo com a mesma disciplina de dados.

---

## O que o MVP entrega hoje

### Produto

| Capacidade | Estado |
|------------|--------|
| Scouting soccer (Big5 europeias + ecossistema BR/MLS no produto) | Live em `DATA_SOURCE=db` |
| Basketball (NBA + base NCAA em evolução) | Live parcial |
| American football (NFL + CFB) | Live parcial |
| Ratings / metodologia documentada | Live (`/methodology`, docs) |
| Crests, fotos, standings via feeds | Live com cache |
| Modo demo (`mock`) vs base real (`db`) | Live |

### Stack

- **Next.js** (App Router) + TypeScript  
- **Supabase Postgres** + Prisma  
- **Tailwind**  
- Pipelines de dados (`npm run data:*`) com runbook de startup  

### Segurança de dados

Tabelas de aplicação com **RLS lockdown** no Supabase (anon/authenticated sem acesso PostgREST). A app fala com a base via Prisma/`DATABASE_URL`, não via chave anónima aberta.

---

## Como medimos maturidade (Startup KPI)

Meta de honestidade do MVP de soccer:

> **≥ 90% dos jogadores do showcase Big5 com ≥ 1 temporada produtiva**

**Big5 no KPI:** Premier League · La Liga · Serie A · Bundesliga · Ligue 1  

**Temporada produtiva (soccer):** piso honesto em código (`isProductiveSeasonRow`) — ≥ 4 aparições **e** ≥ 270 minutos (AND). Não usar OU: cameos com muitos jogos e poucos minutos não contam.

**O que não conta como vitória:**

- Inflar o plantel com jogadores inventados só para “fechar” uma linha de stats.  
- Declarar 90% de *todo* o banco (incluindo stubs AF/NCAA).  
- Tratar MLS como prioridade antes do Brasileirão.  

**Sequência de KPIs de soccer:** Big5 primeiro → **Brasileirão Série A** a seguir (mesmo piso produtivo) → freeze → resto do mercado.

Comando de verdade:

```bash
npm run data:coverage
```

→ bloco **Startup KPI — Soccer Big5 showcase**.

---

## Retrato atual (agosto 2026)

### Soccer (prioridade #1)

| Sinal | Situação |
|-------|----------|
| KPI Big5 (≥1 produtiva) | ~**85.4%** (pós ESPN + prune invent stubs); ~462 zeros restantes — muitos near-miss / banco |
| Estratégia | API cirúrgica (`--refresh --big5-only --prefer-zeros`) quando houver quota; ESPN só em janelas curtas |
| Limpeza | Invent stubs sem temporada produtiva já podados; não afrouxar o piso AND só para fabricar 90% |
| EuroLeague | Temporada praticamente sincronizada (boxscores cacheados; maioria com season stats) |
| Brasileirão | No produto (ESPN `bra.1`, UI, enrich API); **próximo KPI** depois do Big5 ≥90% — antes de NCAA/AF |
| MLS | No produto; **depois** do freeze Big5+BR (não bloqueia o mercado BR) |

### Basketball

Base NBA com dual-season em evolução; NCAA só **depois** do freeze soccer (Big5 + Brasileirão).

### American football

Pipelines NFL/CFB ativos; cobertura global ainda baixa — **depois** do freeze soccer (Big5 + BR).

### Engenharia de dados (já no código)

- Create-missing na API: **opt-in** (`--create-missing`), não default.  
- ESPN prior-season: **não cria** plantel inventado quando `seasonYear` está definido.  
- Prune de stubs: `npm run data:prune-soccer-stubs` (+ `--force-match-stats` pós-backfill).  
- Runbook: `docs/STARTUP-DATA-RUNBOOK.md`.

---

## O que vamos melhorar a seguir

Ordem explícita de execução:

1. **Fechar o lote ESPN Big5 em curso** (janela histórica 2024/25, sem inventar jogadores).  
2. **Medir** `data:coverage` de novo.  
3. **Podar invent stubs** sem temporada produtiva.  
4. **Iterar fills** até ≥90% Big5 (só jogadores existentes).  
5. **Brasileirão Série A** — pilar #2, mesma barra ≥90% (ESPN `bra.1` + API, sem create-missing).  
6. **Freeze** showcase soccer **Big5 + BR**.  
7. **Product UI** — redesign para cara de produto completo (inspiração [Opta Analyst](https://www.statsperform.com/about/opta-analyst/) / [theanalyst.com](https://theanalyst.com/)); ver [PRODUCT-UI-NORTH-STAR.md](./PRODUCT-UI-NORTH-STAR.md).  
8. **Ligas de transição** (PT, NL; MLS depois) — expansão horizontal no futebol.  
9. **Colleges / High School** — tese de mercado negligenciado.  
10. **Basketball NCAA / AF** com produção real → **auth / piloto**.

Fora de escopo imediato: chasear 90% de AF+NCAA+HS; paralelizar ETLs pesados (P1017); redesenhar UI **antes** do freeze de dados (hoje ainda parece protótipo — isso é fase 7, não atalho).

---

## Narrativa para investidor / parceiro (2 minutos)

**Antes:** scouting fragmentado e métricas opacas.  
**OmniScout:** uma plataforma multi-desporto que trata profundidade de dados como feature de produto.  
**Prova:** KPIs públicos e reproduzíveis (≥90% Big5, depois ≥90% Brasileirão), pipelines documentados, RLS, metodologia aberta.  
**Tração técnica:** Big5 + Champions + caminho claro para Série A brasileira como segundo pilar de soccer — BB e AF no mesmo modelo.  
**Pedido implícito:** piloto (academy / scouting cell BR ou europeia) após freeze **Big5 + Brasileirão** — não vender cobertura que ainda não existe.

---

## Narrativa para demo de produto (90 segundos)

1. Abrir scouting soccer num clube Big5 — perfil com temporada produtiva, não card vazio.  
2. Mostrar o segundo pilar: clube do **Brasileirão** com a mesma profundidade (quando o KPI BR estiver fechado).  
3. Mostrar honestidade: jogador sem amostra ≠ “score inventado”.  
4. Fechar: industrializamos **cobertura real**, liga a liga — Big5 → BR → resto do mercado.

---

## Riscos que assumimos com transparência

| Risco | Mitigação |
|-------|-----------|
| Quota API-Football (~100 calls/dia) | Lotes diários + ESPN sem quota para jogos |
| Plantel diluído por create-missing legado | Create off por default + prune de invent stubs |
| Jovens/banco que nunca atingem o piso produtivo | Aceitar zeros reais; não fingir 100% |
| Conexões longas no pooler (P1017) | Lotes menores, `PRISMA_LOG_QUIET`, um ETL pesado de cada vez |

---

## Product UI (fase ativa — pós-freeze)

Dados soccer **congelados** em Big5 ~85% / BR ~81% (2026-08-02) para desbloquear redesign. Meta 90% fica aspiracional em background.

Meta de percepção: **produto de sports intelligence**, não scaffold AI.  
Referências: [Opta Analyst](https://www.statsperform.com/about/opta-analyst/), [theanalyst.com](https://theanalyst.com/).  
Detalhe: [PRODUCT-UI-NORTH-STAR.md](./PRODUCT-UI-NORTH-STAR.md).

## Documentos relacionados

| Documento | Uso |
|-----------|-----|
| [RESUMO-E-PROXIMOS-PASSOS.md](./RESUMO-E-PROXIMOS-PASSOS.md) | Estado + agora |
| [STARTUP-DATA-RUNBOOK.md](./STARTUP-DATA-RUNBOOK.md) | Comandos de dados |
| [PRODUCT-UI-NORTH-STAR.md](./PRODUCT-UI-NORTH-STAR.md) | Design system / UI **ativa** |
| [DATA-COVERAGE.md](./DATA-COVERAGE.md) | Inventário de cobertura |
| [SCORING.md](./SCORING.md) | Metodologia de scores |
| [OMNISCOUT-INTELLIGENCE-PLAYBOOK.md](./OMNISCOUT-INTELLIGENCE-PLAYBOOK.md) | Inteligência / paridade |
| [DEMO-DATA-SOURCE.md](./DEMO-DATA-SOURCE.md) | `mock` vs `db` em demos |
| [PROJECT-STATUS-AND-SPORT-PARITY.md](./PROJECT-STATUS-AND-SPORT-PARITY.md) | Paridade por desporto |

---

## Resumo executivo

OmniScout já é um **MVP apresentável**: multi-desporto, scouting usable, metodologia e pipelines reais.  
**Agora:** Product UI (sair do look AI) com dados congelados ~85% Big5 / ~81% BR — depois Colleges/NCAA/AF e piloto.