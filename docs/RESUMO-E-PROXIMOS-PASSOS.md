# OmniScout — resumo e próximos passos

> Atualizado: 3 ago 2026 · **freeze de dados** · Product UI · landing Fase 1

---

## O que é

**OmniScout** — Sports Intelligence / scouting multi-desporto (futebol, basquete, AF). Diferencial: profundidade honesta de dados.

**Demo:** https://football-intelligence-plataform.vercel.app/

---

## Freeze (decisão)

| Frente | KPI | Decisão |
|--------|-----|---------|
| Big5 | ~**85%** ≥1 produtiva | Congelado — retomar 90% em background |
| Brasileirão | ~**81%** | Congelado — ESPN 2025 esgotou |
| Product UI | — | **Fase atual** (sair do look AI) |
| Auth / piloto | — | Depois da UI core |

---

## Agora

### Fase 1 — Landing (em curso / feito)

- Masthead brand-first (sem fotos a duplicar capítulos)
- Capítulos por desporto com fotografia
- Workflow / Trust / Close com ritmo sports editorial
- North star: Dribbble sports + Analyst + regra desk separado

### Fase 2 — Desk (próximo)

Hub scouting / shell / perfil com densidade **analytics** (Alignify-like) e primitives **[shadcn/ui](https://ui.shadcn.com/)**:

1. Header editorial no hub scouting + fluxo discover claro  
2. Shell (sidebar/header) menos “AI dashboard”  
3. Perfil / compare / shortlist com `tabs`, `table`, `badge` existentes  
4. Sample limits e empty states honestos na UI do produto  

Dados: só low-quota ocasional — **não** bloquear UI.

---

## Docs

| Doc | Uso |
|-----|-----|
| [PRODUCT-UI-NORTH-STAR.md](./PRODUCT-UI-NORTH-STAR.md) | UI ativa + referências |
| [OMNISCOUT-MVP.md](./OMNISCOUT-MVP.md) | Pitch |
| [AUDIT-OmniScout.md](../AUDIT-OmniScout.md) | AppSec |
| `PROMPT_CONTEXT.md` | Cursor |
