# Presença: quem está ativo no painel agora

Data: 2026-08-28
Status: Implementado (`dragons-platform` branch
`feat/presenca-usuarios-ativos`). Não toca no bot nem no Firestore.

## Contexto

Vários founders/admins mexem no painel ao mesmo tempo e não há nenhuma
trava de edição: quem salvar por último sobrescreve o outro
(`PATCH /api/panels/:id` faz um `set` do documento inteiro). Queremos ao
menos **tornar visível** quem está online e em que tela cada pessoa está,
para reduzir sobrescritas acidentais e dar sensação de presença.

## Decisão de arquitetura: presença é efêmera e só em memória

A presença **não persiste**. O servidor mantém um `Map<userId, entry>` em
memória (`server/src/presence/registry.ts`), no mesmo espírito do
`revalidationCache` do `auth/plugin.ts`: evicção preguiçosa na leitura, sem
timer de fundo. Um usuário some da lista após `PRESENCE_TTL_MS` (45s) sem
heartbeat.

Consequência assumida: **só funciona com uma única instância do servidor**
(hoje é um container só, `docker-compose.yml`). Se um dia rodar em mais de
um processo, este registro precisa migrar para Firestore ou Redis — o
formato (`PresenceUser` em `shared/src/presence.ts`) já isola isso.

Nada de WebSocket/SSE: o client faz polling via o próprio heartbeat.

## Contrato

Tudo dentro do escopo autenticado (`requireAuth`). A presença usa só os
dados de `request.authSession` — do corpo vem apenas `location`.

- `POST /api/presence` `{ location: string }` → registra/renova a presença
  do usuário e responde `{ users: PresenceUser[] }` (heartbeat + leitura no
  mesmo request).
- `GET /api/presence` → `{ users: PresenceUser[] }`.
- `DELETE /api/presence` → remove a presença do usuário na hora (saída
  limpa no fechar aba / logout). `204`.

`PresenceUser = { id, username, avatarUrl, location, lastSeenAt }`.

`location` é uma string curta (máx. 64) com convenção: telas fixas
(`panels`, `panel-new`, `settings`, `support-categories`,
`support-category-new`) ou `panel:<id>` / `support-category:<id>` para
edição de um recurso. Helpers `formatPanelLocation` /
`formatSupportCategoryLocation` / `parsePanelLocation` em
`shared/src/presence.ts`.

## Client

- `PresenceProvider` (`client/src/context/PresenceContext.tsx`) montado pelo
  `AppLayout` (que só renderiza logado). Mantém heartbeat a cada 20s,
  pausa quando `document.hidden`, bate na hora ao voltar o foco, e faz
  `DELETE` best-effort no `pagehide` e ao desmontar (logout).
- `usePresenceLocation(location)` — cada página de rota declara em que tela
  está, no topo do componente.
- `PresenceBar` no header: pilha de avatares de quem mais está online (o
  próprio não conta), tooltip com "fulano — editando o painel X".
- `PanelsPage`: emoji ✏️ + nomes na linha do painel que outra pessoa está
  editando agora.
- `PanelCoEditors` no editor de painel: aviso amarelo quando outra pessoa
  está com o mesmo painel aberto ("a última a salvar sobrescreve").

## Fora de escopo

Trava de edição / merge de conflito / "salvo por outra pessoa, recarregue".
Isto aqui é só sinalização visual.
