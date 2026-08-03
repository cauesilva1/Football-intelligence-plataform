# OmniScout — Product UI north star

> **Fase ativa (2026-08-03):** freeze de dados Big5 ~85% / BR ~81% — **Product UI em curso**.  
> **Objetivo:** deixar de parecer “protótipo gerado por AI” e passar a parecer **produto editorial + sports intelligence**.

## Freeze de dados

Não bloqueamos mais a UI à espera dos 90%. KPI aspiracional continua nos resets; redesign **não** espera.

## Referências (inspiração, não cópia)

### Credibilidade editorial

| Referência | O que levar |
|------------|-------------|
| [Opta Analyst](https://www.statsperform.com/about/opta-analyst/) | Dados → narrativa; credibilidade |
| [theanalyst.com](https://theanalyst.com/) | Hierarquia editorial, hubs por liga, multi-desporto sem dashboard genérico |

### Energia sports (landing)

| Referência | O que levar |
|------------|-------------|
| [AI Football Agency](https://dribbble.com/shots/27292555-Sports-Website-AI-Football-Agency-Landing-Page) | Tipografia display agressiva, CTAs óbvios |
| [Turfhub](https://dribbble.com/shots/25935042-Turfhub-Turf-Booking-Sports-Website) | Contraste paper × blocos escuros, secções com peso |
| [Running Sport](https://dribbble.com/shots/26185032-Running-Sport-Website) | Ritmo de scroll, uma composição por viewport |
| [Football Player LP](https://dribbble.com/shots/26940773-Football-Player-Landing-Page-Design) | Brand/hero com presença, sem clutter |
| [Sports Website UI](https://dribbble.com/shots/26937328-Sports-Website-UI-Design) | Hierarquia clara, peers nomeados |
| [Basketball Sports](https://dribbble.com/shots/27613146-Basketball-Sports-Website) | Energia desportiva sem virar template neon |

**Não copiar:** um único desporto no hero, collage de cards, glow “AI”, mock de dashboard no primeiro viewport.

### Densidade analytics (desk — Fase 2)

| Referência | O que levar |
|------------|-------------|
| [Alignify Analytics](https://dribbble.com/shots/26928850-Alignify-Revenue-Analytics-Dashboard-UI) | Densidade, tabs, métricas legíveis |
| [Gambling Analytics](https://dribbble.com/shots/27495291-Gambling-Analytics-Dashboard) | Tabelas e painéis para o hub — **não** na landing |

### Componentes de produto

| Referência | O que levar |
|------------|-------------|
| [shadcn/ui](https://ui.shadcn.com/) | Primitives já em `src/components/ui/` (`button`, `tabs`, `table`, `badge`…) no **desk**; landing fica em CSS editorial (`landing.css`), sem card spam |

Barra: *se removeres o logo, ainda parece sports intelligence sério — não template SaaS.*

## Regra de divisão

| Superfície | Linguagem |
|------------|-----------|
| **Landing** | Energia sports + editorial Analyst; fotos de jogo **só** nos capítulos por desporto; hero = masthead brand (peers em texto) |
| **Desk** (`/scouting`, perfil, compare) | Densidade analytics + shadcn; headers editoriais; sample limits honestos |

## Feedback que motivou a fase

- UI **monocromática** / dark SaaS
- Pouco **intuitiva**
- Visual **muito “AI”**
- Hero com fotos a **duplicar** os capítulos por desporto

## Princípios

1. Uma composição por viewport  
2. Brand first (OmniScout como herói na landing)  
3. Tipografia expressiva — **proibido Inter/Roboto/Arial como voz**  
4. Atmosfera (gradiente/textura), não flat único  
5. Editorial + tool — sem card spam  
6. Dados honestos na UI (empty states / sample limits)  
7. Motion com propósito (2–3)  
8. Mobile parity  
9. Três sports iguais — sem soccer-only no primeiro viewport  

## Backlog desta fase

1. **Design system** — fonts + tokens CSS (app-wide) ✅  
2. **Landing** — masthead brand-first + capítulos com fotos + workflow/trust/close ✅ em curso  
3. **Hub scouting (Fase 2)** — shadcn + densidade Alignify-like, header editorial, fluxo discover claro  
4. **Shell (Fase 2)** — sidebar/header menos “AI dashboard”  
5. **Perfil (Fase 2)** — intelligence legível  
6. Depois: BB / AF no mesmo sistema visual  

## Critério de “done”

Um desconhecido abre o OmniScout e, em 10 segundos, classifica-o como **produto de sports intelligence** — não demo Next.js / AI scaffold.
