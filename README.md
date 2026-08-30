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

Desde a fase 1 (autenticação), o servidor exige credenciais reais para
subir: um app OAuth2 do Discord (`DISCORD_CLIENT_ID`/`_SECRET`), o token
do bot (`DISCORD_TOKEN`), o ID da guild (`DISCORD_GUILD_ID`), um
`SESSION_SECRET` (ex.: `openssl rand -hex 32`) e o caminho da service
account do Firebase (`FIREBASE_SERVICE_ACCOUNT_PATH`) — veja
`.env.example` para a lista completa e `server/src/config/env.ts` para
como cada uma é validada.

Em dois terminais:

```bash
npm run dev:server   # API Fastify em http://localhost:3000
npm run dev:client   # SPA Vite em http://localhost:5173 (proxy /api -> :3000)
```

Abra `http://localhost:5173` — deve aparecer a tela de login ("Entrar com
Discord").

## Configuração do recrutamento

A tela **Recrutamento** (`/recrutamento`) é a única fonte de configuração do
fluxo de `/recrutar` do bot — não existe comando equivalente no Discord. Ela
escreve `recruitmentConfigs/{guildId}` no Firestore, documento que o bot lê a
cada recrutamento: cargos de iniciante, áreas (cada uma com 1..n cargos e
pontuação), canal da ficha, cargos que aprovam, cargos que podem dar pontos e
**todas** as mensagens — layout (`embed`/`container`), título, texto, cor,
imagem e os botões com emoji.

O bot congela essa configuração no momento do `/recrutar`, então salvar aqui
vale para os **próximos** recrutamentos: wizards em andamento e fichas já
enviadas mantêm o formato com que nasceram.

A aba **Ticket e rotas** configura o ticket de verificação (a thread privada
aberta pelo botão "Verificar-se" de um painel) e para onde a ficha é
encaminhada: a área marcada como **Família** manda a ficha para os Founders
("Verificação das Posses"); qualquer outra área, para a Liderança de REC.
Veja `docs/specs/2026-08-30-verificacao-recrutamento-por-ticket.md`.

## Painel só de texto

Um painel pode ter `kind: "text"`: só a mensagem (título, descrição, imagem,
cor, layout `embed`/`container`), com botões **opcionais**. É o formato dos
painéis informativos (regras, avisos) e do painel de verificação, que leva
um único botão "Verificar-se".

## Verificação

```bash
npm run check   # format:check + lint + typecheck + build
```

Rode esse comando antes de considerar qualquer mudança concluída.
