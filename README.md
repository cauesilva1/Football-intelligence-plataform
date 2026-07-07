# Football Intel Platform ⚽📊

Uma plataforma de Football Intelligence de alta performance voltada para Scouting, Analytics e comparação avançada de atletas. O ecossistema integra datasets analíticos profundos, scrapers automatizados em runtime e barramento de mídia híbrido, mitigando custos de infraestrutura através de uma arquitetura multicamadas de persistência.

---

## 🏗️ Arquitetura de Dados & Engenharia de Infraestrutura

### 1. Sistema Híbrido de Federação de Dados (Data Federation)
- **Scouting Profundo (Dataset Local):** Consultas relacionais performáticas no Supabase alimentadas por um dataset robusto baseado no FBref (mais de 2.800 atletas com métricas avançadas por 90 minutos).
- **Dados Históricos Auditados:** Integração nativa com o repositório aberto **StatsBomb Open Data** para renderização de torneios e ligas passadas via arquivos JSON estruturados.
- **Runtime Scrapers (ESPN Feed):** Desenvolvimento de robôs extratores em Node.js acoplados aos feeds públicos da ESPN para sincronizar os 104 jogos da Copa do Mundo de 2026 em tempo real (`scripts/fetch-wc2026.js`) e as tabelas de classificação vigentes de ligas internacionais, incluindo o **Brasileirão Série A** (`bra.1`), servindo como fallback de dados em tempo real sem custo de infraestrutura.

### 2. Blindagem de Cota e Cache Multicamadas (API Shielding)
- **Persistência de Mídia:** Fotos de jogadores e escudos de clubes enriquecidos via **API-Sports** (forçados na temporada estável de 2024) são cacheados e persistidos permanentemente no Supabase no primeiro carregamento (`photoUrl`). Requisições subsequentes são resolvidas localmente em <50ms, reduzindo o consumo de cota diária a zero para dados já conhecidos.
- **Cache de Curto Prazo (PostgreSQL):** Respostas voláteis de tabelas e torneios utilizam uma tabela dedicada de `SystemCache` no PostgreSQL com expiração automatizada (TTL de 15 minutos), evitando requisições duplicadas e gargalos de concorrência.

### 3. Sanitização e Busca Preditiva de Alta Performance
- **Higienização via Expressões Regulares:** Tratamento agressivo de strings (`sanitizeApiSportsSearch`) para remover acentos, pontos isolados (ex: "Vini Jr.") e caracteres especiais antes do tráfego com APIs externas, eliminando falhas de validação.
- **Combobox Autocomplete:** Substituição de seletores HTML estáticos por componentes preditivos de busca em memória (`Command` Shadcn/UI) para filtrar instantaneamente os milhares de registros da base por texto normalizado.

---

## 🎨 UI/UX Imersiva & Identidade Visual Dinâmica
- **Algoritmo de Contexto Visual (`team-theme.ts`):** O front-end analisa contextualmente o clube e a competição de origem do atleta, injetando paletas de cores premium e gradientes de alto contraste diretamente nos componentes de UI, cabeçalhos e gráficos de radar. Possui suporte nativo a mais de 30 gigantes do futebol brasileiro e europeu (Real Madrid, Barcelona, Manchester United, Flamengo, Palmeiras, Milan, Inter, etc.).

---

## 🛠️ Stack Tecnológica
- **Framework:** Next.js (App Router)
- **Linguagem:** TypeScript
- **Banco de Dados:** Supabase (PostgreSQL)
- **ORM:** Prisma
- **Estilização:** Tailwind CSS & Shadcn/UI

---
