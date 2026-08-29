# AGENTS.md

Instruções para qualquer agente de IA (Claude, Codex, Copilot, Cursor,
Gemini, etc.) trabalhando neste repositório. Este é o único arquivo com
instruções completas — `CLAUDE.md` e equivalentes apenas apontam para cá.

## O que é este projeto

Painel web administrativo para o bot de Discord Dragons (repositório
irmão: `~/dev/dragonsbot`). Permite que founders/admins de um servidor
Discord criem "painéis" (mensagens com embed + imagem + até 25 botões) com
pré-visualização fiel ao Discord, publiquem em canais e configurem cargos e
canais do bot. O painel lê e escreve no **mesmo** Firestore que o bot já
usa — não é um banco de dados separado.

Este repositório está na fase 0 (scaffold): apenas a estrutura, os tipos
compartilhados e um `GET /api/health` existem. Nenhuma UI de negócio,
autenticação OAuth ou integração com Firestore foi implementada ainda.

## Estrutura

```
client/     SPA Vite + React + TypeScript (Tailwind v4, dark-first)
server/     API Fastify + TypeScript
shared/     tipos TypeScript compartilhados entre client e server (@dragons/shared)
```

Workspaces npm: os três pacotes vivem em `package.json` na raiz sob
`workspaces`. `client` e `server` dependem de `shared` via
`"@dragons/shared": "*"` (resolvido pelo link do workspace).

## Regra crítica: tipos em `shared/` são espelho do bot

Os tipos em `shared/src/panel.ts`, `shared/src/guild-config.ts`,
`shared/src/support-category.ts` e `shared/src/recruitment-config.ts` são
cópias deliberadas de `dragonsbot/src/domain/types.ts` (`PanelConfig`,
`PanelButtonConfig`, `PanelButtonStyle`, `GuildConfig`, `RoleConfigKey`,
`ChannelConfigKey`, `SupportCategoryConfig`, `RecruitmentFlowConfig` e os
tipos que ela compõe). Eles descrevem o formato dos mesmos documentos no
Firestore que o bot lê e escreve.

**Qualquer alteração de forma nesses tipos (campos, tipos, valores
possíveis) precisa ser feita nos DOIS repositórios ao mesmo tempo** —
`dragonsbot` e `dragons-platform`. Alterar só um lado faz os dois
divergirem silenciosamente: o painel passaria a ler/escrever dados
incompatíveis com o que o bot espera, sem nenhum erro de compilação
avisando disso.

`shared/src/panel-job.ts` contém `PanelJob`/`PanelJobStatus`, um tipo NOVO
que ainda não existe no bot — será criado lá quando o bot ganhar o worker
que processa jobs de publicação de painel. Até lá ele só existe aqui.

## Comandos

```bash
npm install                # instalar dependências (raiz, uma vez)

npm run dev:server         # subir a API Fastify em modo watch (tsx)
npm run dev:client         # subir o Vite dev server (proxy /api -> :3000)

npm run check              # format:check + lint + typecheck + build — rode antes de reportar qualquer mudança como concluída
npm run build               # build de shared, depois server, depois client (nessa ordem)
npm run typecheck           # idem, mas só typecheck (tsc --noEmit)
npm run lint                 # eslint em todo o repo
npm run format               # prettier --write
npm run format:check         # prettier --check
```

`shared` precisa ser buildado (`dist/`) antes de `server`/`client`, porque
os dois consomem `@dragons/shared` via `dist/index.js` +
`dist/index.d.ts`. Os scripts `build`/`typecheck` da raiz já respeitam essa
ordem — não rode `tsc` direto dentro de `server/` ou `client/` sem antes
rodar `npm run build:shared`, ou o typecheck vai falhar por falta de
`dist/`.

Não há suíte de testes automatizada ainda nesta fase.

## Ambiente

- Node.js >= 22.
- Variáveis de ambiente em `.env` (veja `.env.example`). Desde a fase 1
  (autenticação), `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`,
  `DISCORD_TOKEN`, `DISCORD_GUILD_ID`, `DISCORD_REDIRECT_URI`,
  `SESSION_SECRET` e `FIREBASE_SERVICE_ACCOUNT_PATH` são obrigatórias —
  o servidor falha cedo na subida (`required(...)` em
  `server/src/config/env.ts`, mesmo padrão de
  `dragonsbot/src/config/env.ts`) se alguma faltar. `CLIENT_ORIGIN` e
  `NODE_ENV` são opcionais (defaults para desenvolvimento local).
- Sem um `.env` com credenciais reais (Discord OAuth app + bot token +
  service account do Firestore), o servidor não sobe — não dá para
  testar o fluxo de login fim a fim sem elas.

## Convenções

- Todo texto voltado ao usuário final (UI do painel, mensagens de erro
  mostradas ao usuário) é em português do Brasil. Identificadores de
  código e comentários ficam em inglês — siga o que já existe no arquivo
  que estiver editando.
- Logs do servidor são JSON estruturado, um evento por linha, via
  `server/src/utils/logger.ts` — mesmo padrão de
  `dragonsbot/src/utils/logger.ts`. Nomes de evento seguem
  `dominio.acao` ou `dominio.acao_estado` (ex.: `server.started`).
- TypeScript `strict: true` em todos os pacotes. Rode `npm run check`
  antes de reportar qualquer mudança como concluída.
- Tema dark-first: os tokens de cor/tipografia do painel vivem em
  `client/src/index.css` como CSS custom properties, e Tailwind v4 lê
  esses valores via bloco `@theme`. A paleta é derivada do Open Color, a
  mesma usada pelo bot nos embeds do Discord — mantenha os comentários que
  explicam a origem de cada cor se for alterá-las.
- Não commitar `.env` nem qualquer `*service-account*.json` (já cobertos
  pelo `.gitignore` — confirme antes de dar `git add`).
