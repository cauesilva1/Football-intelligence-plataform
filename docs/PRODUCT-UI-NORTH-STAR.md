# OmniScout — Product UI north star

> **Quando:** depois do freeze de dados soccer (**Big5 + Brasileirão ≥90%**).  
> **Não agora:** enquanto fechamos profundidade / ETL — UI cosmética não substitui KPI honesto.  
> **Objetivo:** deixar de parecer “protótipo gerado por AI” e passar a parecer **produto editorial + intelligence** completo.

## Referências de mercado (inspiração, não cópia)

| Referência | O que levar |
|------------|-------------|
| [Opta Analyst (Stats Perform)](https://www.statsperform.com/about/opta-analyst/) | Dados → narrativa; credibilidade; “sports intelligence turned into stories” |
| [theanalyst.com](https://theanalyst.com/) | Hierarquia editorial, ticker/hubs por liga, artigos + stats + rankings no mesmo shell, multi-desporto sem parecer dashboard genérico |

OmniScout **não** é um clone de journalism site: continua a ser scouting/freemium. A barra visual e de UX é: *se removeres o logo, ainda parece um produto de sports intelligence sério — não um template SaaS roxo.*

## Diagnóstico atual (honesto)

Hoje o app ainda comunica “protótipo”: tipografia/stack genérica, secções tipo dashboard, pouco branding de herói, densidade de UI sem composição editorial. Isso enfraquece demos mesmo com dados bons.

## Princípios de design (fase Product UI)

1. **Uma composição por viewport** — não um painel de widgets no primeiro ecrã.  
2. **Brand first** — nome OmniScout como sinal de herói onde fizer sentido (landing / hub).  
3. **Tipografia expressiva** — evitar Inter/Roboto/Arial/system como voz principal.  
4. **Atmosfera** — fundos com profundidade (gradiente/textura/imagem de contexto), não flat único.  
5. **Editorial + tool** — hubs de liga/jogador com hierarquia à la Analyst (história → prova estatística → CTA de scouting), sem card spam.  
6. **Dados honestos na UI** — empty states e “sem amostra produtiva” claros; nunca maquilar buracos com scores inventados.  
7. **Motion com propósito** — 2–3 movimentos de hierarquia, não ruído.  
8. **Mobile-first parity** — a composição tem de ler bem no telemóvel.

## Superfícies a redesenhar (backlog futuro)

Ordem sugerida pós-freeze:

1. **Landing / marketing** — narrativa startup + prova do Startup KPI.  
2. **Hub de scouting soccer** (Big5 + BR) — lista/liga com cara de produto.  
3. **Perfil de jogador** — intelligence + depth badge + trajetória só quando elegível.  
4. **Shell global** — nav, tipografia, tokens CSS, dark/light só se o sistema visual o pedir (não default “AI dark purple”).  
5. Depois: basketball / AF hubs com o **mesmo** design system.

## Fora de âmbito nesta fase

- Replicar paywall/newsletter Opta.  
- Construir CMS jornalístico completo.  
- Redesign paralelo a ETLs pesados ou antes do freeze Big5+BR.

## Critério de “done”

Um desconhecido abre o OmniScout e, em 10 segundos, classifica-o como **produto de sports intelligence** — não como demo Next.js / AI scaffold.
