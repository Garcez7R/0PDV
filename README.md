# 0PDV

Sistema de caixa, estoque e catálogo para mercadinhos de bairro, desenvolvido como PWA offline-first com foco em operação rápida, persistência local e sincronização posterior com Cloudflare.

## Visão Geral

O `0PDV` foi pensado para cenários de operação real em pequenos comércios:

- frente de caixa rápida para desktop, tablet e celular
- cadastro e manutenção de produtos
- controle de estoque com ajustes manuais
- operação offline com IndexedDB
- fila local de sincronização para integração com Cloudflare Workers + D1
- experiência responsiva e instalável como PWA

## Status do Projeto

Estado atual da base:

- dashboard operacional conectado a dados locais
- CRUD local de produtos
- ajuste manual de estoque com histórico
- fluxo de venda com carrinho, pagamento e baixa automática no estoque
- relatórios básicos por período
- configurações persistidas localmente
- estrutura inicial de Worker e D1 preparada

Ainda em evolução:

- autenticação e perfis de acesso
- leitura de código de barras por câmera
- sincronização real com backend Cloudflare
- testes automatizados
- auditoria operacional mais avançada

## Stack

### Frontend

- React
- Vite
- TypeScript
- React Router
- Tailwind CSS
- `idb` para IndexedDB
- `vite-plugin-pwa`

### Backend e Persistência

- Cloudflare Workers
- Cloudflare D1
- SQLite semantics via D1

## Arquitetura

O projeto deve seguir uma arquitetura modular, orientada por domínio, e não um monólito centrado em páginas ou arquivos globais.

### Direção arquitetural

- `app/`: bootstrap, rotas, providers globais e composição da aplicação
- `shared/`: utilitários, componentes visuais reutilizáveis, tipos comuns e infraestrutura
- `modules/caixa`: regras, componentes e fluxos do caixa
- `modules/produtos`: catálogo, cadastro, edição e exclusão
- `modules/estoque`: ajustes, alertas e histórico
- `modules/relatorios`: filtros, métricas e visualizações
- `modules/configuracoes`: preferências operacionais e sync
- `modules/sync`: fila offline, reconciliação e integração com backend

### Estrutura atual

Hoje a base já separa responsabilidades entre layout, contexto, persistência e páginas, mas o próximo ciclo ideal é refatorar de `pages + lib + context` para um modelo mais claramente orientado por feature/module.

Estrutura atual:

```text
src/
  components/
  context/
  data/
  layouts/
  lib/
  pages/
  styles/
```

Estrutura alvo recomendada:

```text
src/
  app/
    providers/
    routes/
  shared/
    components/
    lib/
    styles/
    types/
  modules/
    caixa/
      components/
      hooks/
      services/
      types/
    produtos/
      components/
      hooks/
      services/
      types/
    estoque/
      components/
      hooks/
      services/
      types/
    relatorios/
      components/
      hooks/
      services/
      types/
    configuracoes/
      components/
      hooks/
      services/
      types/
    sync/
      services/
      workers/
```

## Estrutura do Projeto

```text
.
├── public/
├── src/
│   ├── components/
│   ├── context/
│   ├── data/
│   ├── layouts/
│   ├── lib/
│   ├── pages/
│   └── styles/
├── worker/
│   ├── migrations/
│   └── src/
├── wrangler.toml
├── vite.config.ts
└── package.json
```

## Funcionalidades

### Caixa

- busca de produto por nome ou código
- carrinho com alteração de quantidade
- cálculo de total e troco
- fechamento de venda com baixa automática no estoque
- pareamento com celular para leitura remota de código de barras

### Produtos

- cadastro de produto
- edição de produto
- exclusão de produto
- pesquisa por nome ou código de barras

### Estoque

- visão consolidada do estoque
- alertas de estoque mínimo
- ajustes manuais de entrada e saída
- histórico de movimentações

### Relatórios

- filtro por hoje, 7 dias e 30 dias
- total vendido no período
- valor estimado do estoque
- produtos em nível crítico

### Configurações

- nome da loja
- estoque mínimo padrão
- monitoramento da fila de sincronização
- sincronização manual local

## Como Rodar Localmente

### Pré-requisitos

- Node.js 20+
- npm 10+

### Instalação

```bash
npm install
```

### Desenvolvimento

```bash
npm run dev
```

### Variável da API remota

Para apontar o frontend publicado para o Worker em produção, configure:

```bash
VITE_API_BASE_URL=https://nexa-pdv-api.seu-subdominio.workers.dev
```

No Cloudflare Pages, essa variável deve ser criada em `Settings > Environment variables`.

### Verificação

```bash
npm run check
npm run lint
npm run build
```

## Worker e D1

O projeto já inclui uma base inicial para backend em Cloudflare Workers e esquema SQL inicial em D1.

Arquivos principais:

- `wrangler.toml`
- `worker/src/index.ts`
- `worker/migrations/0001_initial.sql`

## Deploy no Cloudflare

Estratégia recomendada para este projeto:

1. publicar o frontend no Cloudflare Pages
2. publicar a API no Cloudflare Workers
3. conectar o Worker ao D1
4. apontar o frontend para a URL pública da API ou usar roteamento sob domínio próprio

### Build do frontend

- comando: `npm run build`
- diretório de saída: `dist`

### Deploy do Worker

- comando: `npx wrangler deploy`

### Banco D1

- criar banco com `npx wrangler d1 create nexa-pdv`
- copiar o `database_id` retornado
- atualizar o `wrangler.toml`
- aplicar migrations com `npx wrangler d1 execute nexa-pdv --remote --file=worker/migrations/0001_initial.sql`
- aplicar também a migration do leitor remoto com `npx wrangler d1 execute nexa-pdv --remote --file=worker/migrations/0002_scanner_sessions.sql`

## Scripts Disponíveis

- `npm run dev`: ambiente local
- `npm run build`: build de produção
- `npm run preview`: preview local
- `npm run lint`: lint
- `npm run check`: checagem TypeScript

## Roadmap

- refatorar para arquitetura totalmente modular por domínio
- integrar autenticação
- adicionar scanner por câmera
- conectar sync real entre IndexedDB e D1
- incluir testes unitários e de integração
- endurecer regras de negócio no backend

## Referências

- Cloudflare D1 Get Started: https://developers.cloudflare.com/d1/get-started/
- Cloudflare Wrangler Configuration: https://developers.cloudflare.com/workers/wrangler/configuration/
- Cloudflare Pages Build Configuration: https://developers.cloudflare.com/pages/configuration/build-configuration/

## Licença

Uso interno ou privado até definição formal de licenciamento.
