# Relatório de AppSec — OmniScout (football-intelligence-plataform)

**Repo:** github.com/cauesilva1/Football-intelligence-plataform
**Live:** https://football-intelligence-plataform.vercel.app
**Stack:** Next.js 15 (App Router) + TypeScript + Prisma + PostgreSQL (Supabase) — **sem sistema de contas de usuário** (produto de leitura pública, "No public signup")
**Escopo analisado:** `src/middleware.ts`, `src/app/api/cron/*`, `src/app/api/players/[id]/route.ts`, `src/lib/cron/authorize-request.ts`, `src/lib/workspace/*` (device-cookie, device-id, shortlist-store), `src/lib/actions/*` (reports, workspace, players-by-ids, teams, players), `src/features/scouting/actions/enrich-af-player-seasons.ts`, `src/lib/ai/scout-report-generator.ts`, `src/lib/action-guard.ts`, `src/lib/rate-limit.ts`, `prisma/sql/enable-rls-lockdown.sql`, `src/scripts/secure-rls.ts`, `.env.example`.
**Data:** 2026-08-02

---

## Contexto importante para a leitura deste relatório

Diferente do Contribly, o OmniScout **não tem autenticação de usuário** — é um produto de dados de scouting somente leitura, com um "workspace" pessoal (shortlist/relatórios) identificado por um cookie de dispositivo anônimo (`omniscout_device`), não por login. Isso muda o modelo de ameaça: não há contas para sequestrar, e os dados manipuláveis pelo visitante (shortlist, notas) não são sensíveis. Os riscos aqui giram em torno de **abuso de recursos/custo** (APIs externas com cota) e **exposição de segredos de infraestrutura**, não em torno de account takeover ou IDOR entre usuários.

---

## Resumo executivo

| # | Achado | Severidade | Status |
|---|--------|-----------|--------|
| 1 | Comparação não-constant-time do `CRON_SECRET` em 3 rotas de cron | 🟠 Médio | ✅ Corrigido |
| 2 | Rate limiting em memória, por instância — não é um limite real em produção serverless | 🟡 Médio/Baixo | ⏳ Adiado (pós-piloto) |
| 3 | `getPlayersByIds` sem limite no tamanho do array de entrada | 🟡 Baixo | ✅ Corrigido |
| — | Vazamento de `.env` real | ✅ Não aplicável — só `.env.example` foi enviado desta vez |
| — | RLS no Postgres/Supabase | ✅ Excelente — melhor que o padrão do Contribly: policies `RESTRICTIVE` explícitas de deny-all para `anon`/`authenticated`, não apenas RLS habilitado sem policy |
| — | Escopo do "workspace" por device-cookie | ✅ Verificado — todas as queries (`listWorkspaceShortlist`, `upsertWorkspaceShortlistEntry`, etc.) filtram corretamente por `deviceId`; sem cross-device IDOR |
| — | Geração de relatório via IA (OpenRouter) | ✅ Verificado — `OPENROUTER_API_KEY` só é usada server-side, nunca exposta ao client; o prompt é montado 100% a partir de dados internos computados (stats do jogador), sem texto livre do usuário → sem superfície de prompt injection |
| — | SQL raw / injeção | ✅ Verificado — os únicos usos de `$queryRawUnsafe`/`$executeRawUnsafe` estão em `src/scripts/secure-rls.ts` (script administrativo local), com nomes de tabela vindos de uma constante fixa no código, nunca de input externo |
| — | API pública de jogador (`/api/players/[id]`) | ✅ Sem problema — dados são públicos por design (não há dado privado por trás dessa rota), acesso via Prisma parametrizado |

---

## 🟠 MÉDIO

### 1. Comparação não-constant-time do `CRON_SECRET`
**Camada:** `src/lib/cron/authorize-request.ts`, usado por `src/app/api/cron/soccer/route.ts`, `.../basketball/route.ts`, `.../american-football/route.ts`

**Descrição:**
```ts
export function isCronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const authorization = request.headers.get("authorization");
  return authorization === `Bearer ${secret}`;
}
```
Mesmo padrão do achado equivalente no Contribly: comparação com `===` faz short-circuit no primeiro byte diferente, abrindo (em teoria) um side-channel de timing.

**Severidade:** Médio (as 3 rotas de cron são endpoints públicos protegidos só por esse secret — sem esse header correto, qualquer um pode tentar).

**Cenário de ataque:** Um atacante com baixa latência de rede até a edge da Vercel tenta inferir o `CRON_SECRET` byte a byte via análise estatística de tempo de resposta. Se bem-sucedido, ganha capacidade de disparar `runSoccerBoxscoreBackfill`, os syncs de basquete/football americano repetidamente — o que consome as cotas gratuitas de API-Football (100 req/dia) e ESPN, potencialmente esgotando-as e quebrando os dados do produto para o dia.

**Remediação:**
```ts
import { timingSafeEqual } from "node:crypto";

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function isCronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const authorization = request.headers.get("authorization");
  if (!authorization) return false;
  return safeCompare(authorization, `Bearer ${secret}`);
}
```
Como esse helper é compartilhado pelas 3 rotas de cron, corrigir aqui já cobre soccer, basketball e american-football de uma vez.

---

## 🟡 MÉDIO/BAIXO

### 2. Rate limiting em memória, por instância — proteção "best effort" contra abuso de cota
**Camada:** `src/lib/rate-limit.ts`, usado por `src/lib/action-guard.ts` → `createScoutingReport` (reports.ts) e `enrichAmericanFootballPlayerSeasonsAction`

**Descrição:** O rate limiter é um `Map` em memória dentro do processo Node — o próprio comentário no código já reconhece isso: *"Per-instance on Vercel (best-effort)"*. Em ambiente serverless, cada instância/lambda fria tem seu próprio `Map`, então o limite nominal (ex.: "5 relatórios / 10 min / IP") na prática vira "5 × N instâncias simultâneas", que pode ser muito maior sob carga ou sob um ataque distribuído propositalmente (múltiplas requisições concorrentes/paralelas fazem a Vercel escalar mais instâncias).

**Severidade:** Médio/Baixo — o código já é consciente da limitação (não é um blind spot), e o dano é limitado a esgotar cotas de terceiros (OpenRouter free tier, API-Football 100 req/dia), não a comprometer dados. Mas como o próprio comentário indica que o objetivo é "proteger gasto com OpenRouter + escritas no banco", vale fechar a lacuna.

**Cenário de ataque:** Um atacante dispara dezenas de requisições `createScoutingReport` em paralelo (não sequencialmente) a partir do mesmo IP. Como cada requisição pode cair em uma instância serverless diferente antes de qualquer uma delas atualizar o mesmo `Map`, o limite de 5/10min é contornado, esgotando a cota diária da API-Football (100 req/dia) e gerando custo/erros no OpenRouter.

**Remediação:**
```ts
// src/lib/rate-limit.ts — trocar o Map em memória por um store compartilhado
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, "10 m"),
});

export async function checkRateLimit(key: string) {
  const { success, reset } = await ratelimit.limit(key);
  if (!success) {
    return { ok: false as const, retryAfterSec: Math.ceil((reset - Date.now()) / 1000) };
  }
  return { ok: true as const };
}
```
Upstash Redis tem free tier generoso e resolve o problema de estado compartilhado entre instâncias sem precisar gerenciar infraestrutura própria.

---

### 3. `getPlayersByIds` sem limite de tamanho no array de entrada
**Camada:** `src/lib/actions/players-by-ids.ts`

**Descrição:**
```ts
export async function getPlayersByIds(ids: string[]): Promise<Player[]> {
  if (ids.length === 0) return [];
  const repo = getPlayerRepository();
  const unique = [...new Set(ids)];
  const players = await Promise.all(unique.map((id) => repo.findById(id)));
  // ...
}
```
Não há teto para `ids.length`. Uma Server Action pode ser chamada diretamente (via fetch para o endpoint interno do Next.js gerado para Server Actions), então um cliente HTTP arbitrário — não só a UI — pode enviar um array com milhares de IDs, disparando o mesmo número de queries Prisma em paralelo (`Promise.all`).

**Severidade:** Baixo (não há dado sensível envolvido — é um endpoint de leitura pública — mas é um vetor de esgotamento de recursos/conexões de banco, especialmente relevante já que o `.env.example` documenta `connection_limit=1` para o pooler serverless da Vercel, ou seja, o pool de conexões é propositalmente pequeno).

**Cenário de ataque:** Atacante chama a Server Action com um array de 5.000–10.000 IDs (reais ou aleatórios). Isso gera milhares de chamadas `findById` concorrentes contra um pool com `connection_limit=1–5`, esgotando o pool e causando lentidão/erros `P2024` (timeout de conexão) para todos os visitantes legítimos — um DoS de baixo esforço.

**Remediação:**
```ts
const MAX_IDS = 50;

export async function getPlayersByIds(ids: string[]): Promise<Player[]> {
  if (ids.length === 0) return [];
  const unique = [...new Set(ids)].slice(0, MAX_IDS);
  // ...resto igual
}
```
Se o caso de uso legítimo (ex.: comparar jogadores, shortlist) nunca passa de ~20–30 IDs de uma vez, um teto de 50 é bastante folgado e fecha o vetor sem afetar UX.

---

## ✅ Pontos verificados sem vulnerabilidade encontrada

- **RLS no Supabase/Postgres** (`prisma/sql/enable-rls-lockdown.sql`) — Implementação mais robusta que a do Contribly: além de habilitar RLS em todas as tabelas (`users`, `players`, `matches`, `workspace_shortlist_entries`, etc.), cria explicitamente policies `RESTRICTIVE ... USING (false) WITH CHECK (false)` para os roles `anon` e `authenticated`. Isso é defesa em profundidade correta: mesmo que a `anon key` do Supabase vaze algum dia, ela não consegue ler nem escrever nada via PostgREST.
- **Escopo do workspace por device-cookie** — `listWorkspaceShortlist`, `upsertWorkspaceShortlistEntry`, `removeWorkspaceShortlistEntry`, etc. sempre filtram por `deviceId` extraído do cookie `httpOnly` do servidor (nunca aceito como parâmetro do cliente) — sem possibilidade de um dispositivo acessar/alterar o workspace de outro.
- **Geração de relatório via IA (OpenRouter)** — a chave `OPENROUTER_API_KEY` só é lida em `src/lib/ai/scout-report-generator.ts`, código server-only, nunca enviada ao bundle do cliente. O conteúdo enviado ao modelo é inteiramente reconstruído a partir de estatísticas internas do jogador (`buildPlayerContext`) — não há campo de texto livre do usuário incluído no prompt, então não há vetor de prompt injection via input do visitante.
- **Uso de SQL raw** — Os únicos `$queryRawUnsafe`/`$executeRawUnsafe` estão em `src/scripts/secure-rls.ts`, um script administrativo rodado manualmente (`npm run db:secure-rls`), com nomes de tabela vindos de um array `const TABLES` fixo no código-fonte — nunca de entrada externa. Sem risco de SQL injection.
- **Rota pública `/api/players/[id]`** — Não expõe nada que não devesse ser público (é a própria proposta do produto: dados de scouting abertos), e o `id`/`season` são passados como parâmetros tipados para o Prisma (parametrizado por padrão), sem concatenação de string em query.
- **Cookie de dispositivo** (`omniscout_device`) — `httpOnly`, `sameSite: lax`, `secure` em produção, gerado com `crypto.randomUUID()`. Adequado para o que protege (um workspace pessoal não sensível).

---

## Recomendações de priorização

1. **#1 (constant-time compare no cron)** — correção rápida e de baixo esforço, mesma classe de problema do Contribly.
2. **#3 (limite de tamanho em `getPlayersByIds`)** — trivial de corrigir, fecha um vetor de DoS barato dado o pool de conexões pequeno documentado no próprio `.env.example`.
3. **#2 (rate limit persistente)** — vale a pena se o produto crescer em tráfego; hoje o custo de exploração é baixo (só afeta cota de API terceirizada), mas a correção com Upstash é simples e já resolve de vez.

---

## Status das remediações (2026-08-02)

| # | Achado | Status | Notas |
|---|--------|--------|-------|
| 1 | `CRON_SECRET` com `===` | ✅ **Corrigido** | `src/lib/cron/authorize-request.ts` usa `timingSafeEqual` (cobre as 3 rotas de cron) |
| 3 | `getPlayersByIds` sem teto | ✅ **Corrigido** | `MAX_IDS = 50` em `src/lib/actions/players-by-ids.ts` |
| 2 | Rate limit só em memória | ⏳ **Adiado** | Aceitável no estágio atual (demo / low traffic). Introduzir Upstash Redis quando houver piloto pago, auth, ou abuso real de OpenRouter/API-Football |

---

## Conclusão

**Veredicto geral: risco residual baixo.** Nenhum achado crítico ou alto.

O OmniScout, neste estágio (leitura pública + workspace anônimo por cookie), tem uma superfície de ataque bem mais estreita que um produto com contas: não há account takeover, IDOR entre usuários, nem tokens OAuth. A postura de dados no Supabase (RLS + policies `RESTRICTIVE` deny-all para `anon`/`authenticated`) é sólida e é o principal controle estrutural.

Os riscos reais concentram-se em **abuso operacional** (cron sem auth → gasto de cota ESPN/API-Football; Server Actions sem teto → pressão no pool Prisma; rate limit best-effort → OpenRouter). Dois desses três já foram fechados neste ciclo (#1 e #3). O #2 permanece como dívida consciente, adequada ao tráfego atual.

**Não bloqueia** demo pública, freeze de dados Big5/BR, nem Product UI. **Antes de auth / piloto pago**, revisar: (a) rate limit distribuído (#2), (b) modelo de ameaça com contas reais, (c) se Server Actions sensíveis passam a exigir sessão.

**Assinatura do ciclo:** auditoria AppSec 2026-08-02 · remediações #1+#3 aplicadas no repo · #2 documentado como follow-up pós-piloto.
