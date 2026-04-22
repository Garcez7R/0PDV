# ØPDV

Sistema de frente de caixa, estoque e operação comercial para pequeno varejo, desenhado para funcionar bem em balcão, tablet e celular, com foco em agilidade operacional, resiliência offline e evolução para sincronização em nuvem.

![React](https://img.shields.io/badge/React-19-20232A?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?logo=tailwindcss&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-Ready-5A0FC8)
![Cloudflare Workers](https://img.shields.io/badge/Cloudflare_Workers-Enabled-F38020?logo=cloudflare&logoColor=white)
![Cloudflare D1](https://img.shields.io/badge/Cloudflare_D1-SQLite-F38020?logo=cloudflare&logoColor=white)
![IndexedDB](https://img.shields.io/badge/IndexedDB-Offline-003B57)

## Resumo Executivo

O `0PDV` foi pensado para operações de varejo que precisam vender, ajustar estoque e consultar informações operacionais com rapidez, mesmo em cenários de conectividade instável.

Ele atende especialmente:

- mercadinhos de bairro
- conveniências
- mercearias
- empórios e pequenos atacarejos
- operações com caixa em desktop e apoio móvel via celular

O produto combina uma experiência de `caixa + catálogo + estoque + operação offline`, com base preparada para integração com `Cloudflare Workers` e `Cloudflare D1`.

## O Que o App Resolve

Na prática, o 0PDV foi desenhado para resolver dores comuns de operação:

- registrar vendas com rapidez no balcão
- consultar e manter estoque sem depender de planilhas
- permitir cadastro e atualização de produtos com governança mínima
- operar localmente quando a internet falha
- usar o celular como leitor remoto para apoiar o caixa
- manter trilha básica de auditoria de ações críticas

## Principais Casos de Uso

### Frente de caixa

- lançamento de itens por nome ou código de barras
- cálculo automático de total e troco
- fechamento de venda com baixa automática no estoque
- uso de leitor remoto pareado por QR Code

### Gestão de produtos

- cadastro, edição e exclusão de itens
- diferenciação entre item por unidade e item por peso
- prevenção de cadastro duplicado por código de barras

### Controle de estoque

- visão consolidada do saldo atual
- ajustes manuais de entrada e saída
- alerta de estoque mínimo
- histórico operacional de movimentações

### Itens por peso

O app suporta produtos vendidos a granel ou por fração de peso, como queijo, frios e itens fracionados.

Exemplos de operação:

- um produto pode ser cadastrado como `Por peso (kg)`
- o preço é tratado por quilograma
- o estoque é mantido em quilogramas
- no caixa, `135 g` devem ser lançados como `0,135`

Isso permite trabalhar corretamente com cenários como:

- queijo fatiado
- frios vendidos por gramas
- produtos embalados sob demanda
- hortifruti precificado por peso

## Estado Atual

O projeto já possui uma base funcional para operação local:

- dashboard operacional
- login por PIN com perfil de operador e gerente
- auditoria local de eventos principais
- CRUD de produtos
- controle e ajuste de estoque
- fluxo de vendas com baixa automática
- suporte a item por unidade e por peso
- scanner remoto com pareamento por QR Code
- persistência local em IndexedDB
- base de Worker e D1 preparada para sincronização

## Arquitetura

O direcionamento do projeto é modular, orientado por domínio, evitando evolução para um monólito centrado apenas em páginas.

### Direção arquitetural

- `app/`: bootstrap, composição, rotas e providers globais
- `shared/`: componentes reutilizáveis, helpers, infraestrutura e identidade visual
- `modules/caixa`: regras e fluxos de frente de caixa
- `modules/produtos`: catálogo e manutenção de itens
- `modules/estoque`: saldo, ajustes e monitoramento
- `modules/relatorios`: métricas e visualização operacional
- `modules/configuracoes`: preferências e governança básica
- `modules/sync`: integração offline/online e envio para a nuvem
- `worker/`: API e sincronização com Cloudflare Workers + D1

### Estrutura atual

```text
.
├── public/
├── src/
│   ├── components/
│   ├── context/
│   ├── data/
│   ├── layouts/
│   ├── lib/
│   ├── modules/
│   ├── pages/
│   ├── shared/
│   └── styles/
├── worker/
│   ├── migrations/
│   └── src/
├── wrangler.toml
├── vite.config.ts
└── package.json
```

## Stack Tecnológica

### Frontend

- React
- TypeScript
- Vite
- React Router
- Tailwind CSS
- `idb` para IndexedDB
- `vite-plugin-pwa`

### Backend e dados

- Cloudflare Workers
- Cloudflare D1
- SQLite semantics via D1

### Operação offline

- IndexedDB para persistência local
- fila local de sincronização
- PWA instalável

## Diferenciais Operacionais

- interface voltada para uso real em balcão
- mesma base servindo desktop, tablet e celular
- pareamento entre caixa e celular para leitura remota
- suporte a produto fracionado por peso
- trilha de auditoria para ações críticas
- modelo pronto para evolução cloud sem perder operação local

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

### Verificação de qualidade

```bash
npm run check
npm run lint
npm run build
```

## Configuração da API

Para apontar o frontend para a API publicada no Cloudflare Workers:

```bash
VITE_API_BASE_URL=https://nexa-pdv-api.seu-subdominio.workers.dev
```

No Cloudflare Pages, configure a variável em `Settings > Environment variables`.

## Worker e Banco D1

Arquivos principais da camada cloud:

- `wrangler.toml`
- `worker/src/index.ts`
- `worker/migrations/0001_initial.sql`
- `worker/migrations/0002_scanner_sessions.sql`
- `worker/migrations/0003_weighted_items.sql`

### Fluxo recomendado de provisionamento

1. Criar o banco D1.
2. Atualizar o `database_id` no `wrangler.toml`.
3. Aplicar as migrations.
4. Publicar o Worker.
5. Configurar o Pages para consumir a URL do Worker.

## Deploy no Cloudflare

### Frontend no Pages

- framework: `Vite`
- build command: `npm run build`
- output directory: `dist`
- branch de produção: `main`

### API no Workers

```bash
npx wrangler deploy
```

### Banco D1

```bash
npx wrangler d1 create nexa-pdv
npx wrangler d1 execute nexa-pdv --remote --file=worker/migrations/0001_initial.sql
npx wrangler d1 execute nexa-pdv --remote --file=worker/migrations/0002_scanner_sessions.sql
npx wrangler d1 execute nexa-pdv --remote --file=worker/migrations/0003_weighted_items.sql
```

## Scripts Disponíveis

- `npm run dev`: ambiente local
- `npm run build`: build de produção
- `npm run preview`: pré-visualização local
- `npm run lint`: lint do projeto
- `npm run check`: validação TypeScript

## Roadmap de Evolução

- ampliar a modularização por domínio
- consolidar sincronização real ponta a ponta com D1
- fortalecer autenticação e gestão de usuários
- expandir auditoria no backend
- adicionar testes unitários e de integração
- endurecer regras de negócio para operação multi-dispositivo

## Posicionamento do Produto

O `0PDV` não é apenas um cadastro de produtos com tela de venda. A proposta é servir como núcleo operacional de um pequeno varejo, com ergonomia para caixa, governança mínima para gestão e caminho claro para escala controlada.

## Licença

Uso interno ou privado até definição formal de licenciamento.
