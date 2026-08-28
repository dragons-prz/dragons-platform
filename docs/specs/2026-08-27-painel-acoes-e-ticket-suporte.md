# Painel: ações genéricas + ticket de suporte

Data: 2026-08-27
Status: Em implementação (par coordenado: `dragonsbot` branch
`feat/painel-acoes-e-ticket-suporte` + `dragons-platform` branch
`feat/painel-acoes-e-ticket-suporte`).

## Contexto

Hoje um painel (`panels/{guildId}_{id}`) é uma mensagem com embed + até 25
**botões**, e cada botão só faz uma coisa ao ser clicado: responde com um
embed efêmero (`PanelButtonConfig.response`). A montagem da mensagem
(`buildPanelMessage`) e o tratamento do clique (`panelButtonHandler`) moram
no bot; a plataforma só edita o documento no Firestore e enfileira jobs de
publicação (`panelJobs`).

Queremos um fluxo de **ticket de suporte** parecido com o print do
"Suporte Pureza": uma mensagem com um **dropdown** de categorias
("Denuncie um membro", "Dúvida", "Parcerias"); ao escolher uma opção, o bot
cria um **tópico privado** (só o autor + cargos de suporte/visualização
enxergam), posta uma mensagem marcando o suporte com botões **"Atender
ticket"** e **"Fechar ticket"**, e registra o atendimento.

### Decisão de arquitetura: painel genérico, ticket é uma _ação_

O painel **não** ganha o conceito de "ticket". Ele ganha duas coisas
genéricas:

1. **Tipo de componente**: além de `buttons`, um painel pode ser do tipo
   `select` (um único dropdown no lugar das linhas de botões).
2. **Ação por item**: cada botão/opção carrega uma `PanelActionConfig` —
   ou `reply` (o comportamento de hoje: responde com embed efêmero) ou
   `run` (dispara uma **ação registrada no bot**, identificada por
   `actionId`, com `params`).

O bot tem um **registry de ações** (`Map<actionId, handler>`). Hoje existe
uma só: `support-ticket`. A lógica de ticket vive isolada nesse módulo, não
em `painel.ts`. Se um dia quisermos um `/gerar-ticket-suporte` manual, o
handler do comando chama o mesmo módulo.

> **Por que não "o botão executa um slash command"?** O Discord não tem API
> para um bot invocar um slash command no lugar do usuário. Mas um handler
> de comando e um handler de botão são só funções que recebem um contexto
> de interação — então a lógica compartilhada resolve o mesmo problema sem
> depender disso.

### O que cada lado faz

| Item                                                                     | Plataforma (web)                           | Bot                                                                                       |
| ------------------------------------------------------------------------ | ------------------------------------------ | ----------------------------------------------------------------------------------------- |
| Tipo do painel (`buttons`/`select`), textos, imagem, cor, opções, emojis | escreve `panels/{guildId}_{id}`            | só lê                                                                                     |
| Ação de cada botão/opção (`reply` ou `run` + `actionId` + `params`)      | mesmo doc                                  | só lê / despacha                                                                          |
| Categorias de ticket (canal-pai, cargos, templates de mensagem)          | escreve `supportCategories/{guildId}_{id}` | só lê                                                                                     |
| Publicar/editar a mensagem do painel                                     | enfileira `panelJobs`                      | consome, `buildPanelMessage`, posta/edita                                                 |
| Usuário escolhe opção no dropdown                                        | — (sem gateway)                            | cria tópico privado, adiciona autor, posta ping do suporte + botões, grava `tickets/{id}` |
| Suporte clica "Atender"/"Fechar"                                         | —                                          | transação Firestore p/ dar claim; posta mensagens; arquiva + remove autor ao fechar       |
| Dashboard de tickets                                                     | lê `tickets`                               | (opcional, fase 3) consome `ticketJobs` p/ ação web→Discord                               |

Nenhum ajuste de ticket fica em código do bot — só a mecânica.

## Regra crítica herdada

`shared/src/panel.ts` é **espelho** de `dragonsbot/src/domain/types.ts`.
Toda mudança de forma abaixo é PR par coordenado nos dois repos. Tipos
novos que o bot ainda não consome (`TicketRecord`) nascem em `shared/` como
`panel-job.ts` nasceu.

## Fases

### Fase 1 — painel `select` + ações genéricas (este par de PRs)

**Espelho (`dragonsbot/src/domain/types.ts` + `shared/src/panel.ts`):**

```ts
export type PanelKind = "buttons" | "select";

export type PanelReplyAction = {
  type: "reply";
  response: string;
  responseImageUrl: string | null;
  responseColor: string | null;
};

export type PanelRunAction = {
  type: "run";
  actionId: string; // ex.: "support-ticket"
  params: Record<string, string>; // ex.: { category: "denuncia-de-membro" }
};

export type PanelActionConfig = PanelReplyAction | PanelRunAction;
```

`PanelButtonConfig` ganha `action: PanelActionConfig`. **Compatibilidade:**
documentos antigos não têm `action` — o bot e a plataforma tratam a
_ausência_ de `action` como
`{ type: "reply", response, responseImageUrl, responseColor }` montada a
partir dos campos legados, que continuam gravados. Um `mapPanelButton`
central faz esse _backfill on read_ nos dois lados (mesmo padrão do
`recruitmentAnnouncementChannelId`).

`PanelConfig` ganha:

```ts
export interface PanelSelectOption {
  id: string; // slug do label, estável — vai no value do select
  label: string;
  description: string | null;
  emoji: string | null;
  action: PanelActionConfig;
  order: number;
}

export interface PanelSelectConfig {
  placeholder: string; // "Selecione uma opção!"
  options: PanelSelectOption[];
}

// em PanelConfig:
kind: PanelKind; // ausente = "buttons"
select: PanelSelectConfig | null; // preenchido só quando kind === "select"
```

**Contrato novo `shared/src/panel-actions.ts` (NÃO é espelho do bot):**

```ts
export interface PanelActionParamSpec {
  key: string;
  label: string;
  required: boolean;
  kind: "text" | "support-category-ref";
}

export interface PanelActionSpec {
  id: string;
  label: string;
  description: string;
  params: PanelActionParamSpec[];
}

export const PANEL_ACTIONS: readonly PanelActionSpec[] = [
  {
    id: "support-ticket",
    label: "Abrir ticket de suporte",
    description: "Cria um tópico privado de atendimento para quem clicou.",
    params: [
      {
        key: "category",
        label: "Categoria de suporte",
        required: true,
        kind: "support-category-ref"
      }
    ]
  }
];
```

Adicionar uma ação nova = editar esse array nos dois repos (o bot valida
`actionId` contra o registry em runtime; a plataforma usa o array para o
formulário do editor).

**Contrato novo `shared/src/support-category.ts` (espelho — bot consome):**

```ts
export type SupportCategoryCloseAction = "archive-remove";

export interface SupportCategoryConfig {
  id: string; // slug, ex.: "denuncia-de-membro"
  guildId: string;
  name: string; // "Denúncia de membro"
  parentChannelId: string; // onde o tópico privado é criado
  supportRoleIds: string[]; // marcados no tópico + podem Atender/Fechar
  viewerRoleIds: string[]; // "cargos altos" que só visualizam
  threadNameTemplate: string; // "denuncia-de-membro-{user}"
  openMessage: string; // template, aceita {user}
  claimMessage: string; // aceita {user} e {claimer}
  closeMessage: string; // aceita {user} e {closer}
  closeAction: SupportCategoryCloseAction;
  createdAt: string;
  updatedAt: string;
}
```

**Coleções Firestore novas:**

- `supportCategories/{guildId}_{id}` — escrita **só pela plataforma**;
  leitura pelo bot.
- `tickets/{ticketId}` (`ticketId` = auto-id do Firestore) — escrita **só
  pelo bot**; leitura pela plataforma (dashboard, fase 3).
- `openTicketKeys/{guildId}_{openerUserId}` — trava de "1 ticket aberto por
  usuário". `create` atômico falha se já existe; apagado ao fechar. Sem
  índice composto (mesmo motivo do `panel-job-repository.ts`).

```ts
// TicketRecord — nasce em shared/, o bot ainda não tem esse tipo
export type TicketStatus = "open" | "claimed" | "closed";

export interface TicketRecord {
  id: string;
  guildId: string;
  panelId: string;
  categoryId: string;
  openerUserId: string;
  parentChannelId: string;
  threadId: string;
  pingMessageId: string;
  status: TicketStatus;
  claimedByUserId: string | null;
  claimedAt: string | null;
  closedByUserId: string | null;
  closedAt: string | null;
  feedbackRating: number | null; // 1..5, fase 2
  feedbackComment: string | null; // fase 2
  createdAt: string;
  updatedAt: string;
}
```

**Bot — runtime:**

- `src/index.ts`: roteia `interaction.isStringSelectMenu()` por prefixo de
  `customId`, análogo a `buttonHandlers` (nova lista `selectMenuHandlers`).
- `src/commands/panel-actions/registry.ts`: `PANEL_ACTION_REGISTRY:
Record<string, PanelActionHandler>`; `PanelActionHandler` recebe
  `{ interaction, store, params }`.
- `src/commands/panel-actions/support-ticket.ts`: a lógica de abrir ticket.
- `buildPanelMessage`: ramo `kind === "select"` → `StringSelectMenuBuilder`
  com `custom_id = panelsel:{panelId}`; cada option `value = option.id`.
- `panelButtonHandler` + novo `panelSelectHandler`: resolvem a
  `PanelActionConfig` do item clicado → `reply` mantém o comportamento
  atual; `run` chama `PANEL_ACTION_REGISTRY[actionId]`.
- Novo `ticketActionButtonHandler` (`customIdPrefix = "ticketact:"`):
  `ticketact:claim:{ticketId}` e `ticketact:close:{ticketId}`.
- Store (`DragonsStore` + `FirestoreDragonsStore`):
  - `getSupportCategory(guildId, id)`, `listSupportCategories(guildId)` (só
    leitura).
  - `claimTicketSlot(guildId, openerUserId)` → `boolean` (create atômico da
    trava); `releaseTicketSlot(guildId, openerUserId)`.
  - `createTicket(input)`, `getTicket(ticketId)`,
    `claimTicket(ticketId, claimerUserId)` (transação: só `open` → `claimed`),
    `closeTicket(ticketId, closerUserId)`.
- `instrumentedStore`: `claim`/`create`/`close`/`release` já contam como
  escrita; `get`/`list` como leitura — sem mudança em `WRITE_PREFIXES`.

**Fluxo `support-ticket` (abrir):**

1. `interaction.deferReply({ flags: Ephemeral })`.
2. `claimTicketSlot(guildId, userId)` — se `false`, responde "você já tem
   um ticket aberto" e encerra.
3. `getSupportCategory(guildId, params.category)` — se não existir, libera a
   trava e responde erro.
4. Cria `ThreadChannel` privada (`type: PrivateThread`) em
   `parentChannelId`, nome = `threadNameTemplate` com `{user}` →
   `slugify(displayName)` (limite 100).
5. `thread.members.add(openerUserId)`.
6. Posta no tópico: `openMessage` renderizado + linha de menções
   `<@&role>` de `supportRoleIds` + `viewerRoleIds` (puxa os membros pro
   tópico privado) + `ActionRow` com **"Atender ticket"**
   (`ticketact:claim:{id}`, `Success`) e **"Fechar ticket"**
   (`ticketact:close:{id}`, `Danger`). Guarda `pingMessageId`.
7. `createTicket(...)` com `status: "open"`.
8. Edita o defer → "Ticket criado: <#threadId>".

**Fluxo "Atender ticket":**

- Valida: quem clicou tem algum cargo de `supportRoleIds` (senão, efêmero
  "apenas o suporte pode usar isto").
- `claimTicket(ticketId, clickerId)`:
  - `open` → `claimed`: posta `claimMessage` no tópico, edita a mensagem de
    ping desabilitando "Atender ticket".
  - já `claimed` → efêmero "já está sendo atendido por <@x>".
  - `closed` → efêmero "este ticket já foi fechado".

**Fluxo "Fechar ticket":**

- Valida cargo de suporte.
- `closeTicket(ticketId, clickerId)` → `status: "closed"`.
- `releaseTicketSlot(guildId, openerUserId)` (libera o autor p/ abrir
  outro).
- Posta `closeMessage` no tópico.
- `closeAction === "archive-remove"`:
  `thread.members.remove(openerUserId)` (autor perde a visualização) →
  `thread.setLocked(true)` → `thread.setArchived(true)`.
- Edita a mensagem de ping desabilitando os dois botões.

**Permissões do bot na guild (documentar no README do bot):**
`Create Private Threads`, `Send Messages in Threads`, `Manage Threads`,
`Mention @everyone, @here e todos os cargos` (para marcar cargos não
mencionáveis).

**Plataforma — server:**

- `server/src/firestore/support-category-repository.ts`:
  `list`/`get`/`create`/`update`/`delete` de `supportCategories/{guildId}_{id}`.
- `server/src/routes/support-categories.ts`: `GET /api/support-categories`,
  `GET /api/support-categories/:id`, `POST`, `PATCH /:id`, `DELETE /:id`.
  Registrado no escopo `requireAuth` em `server/src/index.ts`.
- Validação em `shared/src/support-category-api.ts`
  (`validateSupportCategoryInput`): slug 1–40, nome não vazio,
  `parentChannelId` snowflake e existente na guild como canal de texto,
  cargos snowflake e existentes, templates ≤ 2000, `{user}` presente no
  `threadNameTemplate`.
- `server/src/routes/panels.ts` + `panel-repository.ts`: aceitam `kind`,
  `select` e `action` por botão/opção no `PATCH`. Quando
  `action.type === "run"`, valida `actionId ∈ PANEL_ACTIONS` e os `params`
  requeridos; quando `kind === "support-ticket"` param `category`, valida
  que a categoria existe. `assignButtonIds` passa a atribuir id também às
  opções do select (`assignSelectOptionIds`).

**Plataforma — client:**

- `client/src/api/support-categories.ts` — CRUD.
- `client/src/routes/SupportCategoriesPage.tsx` (lista) +
  `SupportCategoryCreatePage.tsx` + `SupportCategoryEditPage.tsx` (form:
  nome, canal-pai `<select>`, cargos de suporte/visualização
  (multi-select), templates com contador, mesmo padrão de
  `PanelEditPage`/`SettingsPage`).
- `client/src/routes/AppLayout.tsx`: item de nav "Suporte".
- `client/src/App.tsx`: rotas `/suporte`, `/suporte/novo`, `/suporte/:id`.
- `client/src/panel-editor/`:
  - Seletor "Tipo de painel" (Botões / Dropdown).
  - `SelectOptionEditor` / `SelectOptionEditorList` (análogo a
    `ButtonEditor`), com label, descrição, emoji e um **ActionEditor**.
  - `ActionEditor`: rádio `Responder com mensagem` (campos atuais) /
    `Executar ação`; quando "Executar ação", `<select>` de `PANEL_ACTIONS`
    - form de `params` (o param `support-category-ref` vira `<select>`
      populado por `/api/support-categories`).
  - `ButtonEditor` ganha o mesmo `ActionEditor` (um botão também pode
    disparar `run`).
  - `DiscordPanelPreview`: renderiza o dropdown quando `kind === "select"`.

### Fase 2 — feedback (par futuro)

Ao fechar, o bot manda ao autor (DM ou no tópico antes de arquivar) uma
mensagem com botão "Dar feedback" → `isModalSubmit` no `src/index.ts` →
modal nota 1–5 + comentário → grava `feedbackRating`/`feedbackComment` no
`tickets/{id}`. Plataforma ganha as colunas no dashboard.

### Fase 3 — dashboard e ações web→Discord

- `client/src/routes/TicketsPage.tsx` lendo `tickets` (abertos, quem
  atendeu, tempo de resposta).
- `ticketJobs` (espelho de `panelJobs`): forçar fechar / reatribuir /
  mandar mensagem num tópico a partir da web. Novo `startTicketJobWorker`
  no bot.

## Fora de escopo

Multi-guild, roteamento de cargo por permissão granular, SLA/alertas,
transcrição de tópico ao fechar.
