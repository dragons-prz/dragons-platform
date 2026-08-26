# Dragons Painel

Painel web administrativo para o bot de Discord Dragons. Lê e escreve no
mesmo Firestore usado pelo bot (`~/dev/dragonsbot`).

> Instruções detalhadas para trabalhar neste repositório (estrutura,
> convenções, regras sobre os tipos compartilhados) estão em
> [`AGENTS.md`](./AGENTS.md).

## Pré-requisitos

- Node.js >= 22
- npm (workspaces)

## Instalação

```bash
npm install
```

Isso instala as dependências dos três pacotes (`client`, `server`,
`shared`) de uma vez, via npm workspaces.

## Rodando em desenvolvimento

Configure as variáveis de ambiente do servidor:

```bash
cp .env.example .env
```

Nesta fase (scaffold), nenhuma credencial real é necessária — o servidor
sobe apenas com `PORT` (padrão `3000` se não definido).

Em dois terminais:

```bash
npm run dev:server   # API Fastify em http://localhost:3000
npm run dev:client   # SPA Vite em http://localhost:5173 (proxy /api -> :3000)
```

Abra `http://localhost:5173` — a página deve mostrar o resultado da
chamada a `GET /api/health`.

## Verificação

```bash
npm run check   # format:check + lint + typecheck + build
```

Rode esse comando antes de considerar qualquer mudança concluída.
