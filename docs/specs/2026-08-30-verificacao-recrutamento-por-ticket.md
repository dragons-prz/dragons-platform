# Verificação e recrutamento por ticket (lado da plataforma)

Data: 2026-08-30
Status: Planejado. Spec canônica (fluxo completo, tipos, contrato dos dois
lados) em
`dragonsbot/docs/specs/2026-08-30-verificacao-recrutamento-por-ticket.md`.

Este arquivo é o recorte do que muda **neste repositório**. Entrega em
**2 PRs coordenados** (mesmo dia): este vai primeiro, o do `dragonsbot`
depois. Os tipos de `shared/` são espelho de
`dragonsbot/src/domain/types.ts` — mudança de forma exige os dois PRs
juntos (regra crítica do `AGENTS.md`).

---

## Ideia

A entrada de um membro deixa de ser um card automático + `/recrutar` avulso
e vira um pipeline único: **painel de texto "Verificar-se" → thread privada
(ticket de verificação) → `/recrutar` dentro da thread → ficha roteada por
rota (Família = Founders, Área = liderança de REC)**.

A plataforma continua sendo a **única fonte de configuração** desse fluxo
(`recruitmentConfigs/{guildId}`). O que muda aqui:

1. `PanelConfig.kind` ganha `"text"` (painel informativo, botões
   opcionais).
2. `RecruitmentFlowConfig` ganha os blocos `verificationTicket`,
   `familyRoute`, `areaRoute`, o ponteiro `familyAreaId`, o campo
   `pointsResetRoleIds`, e o default de `maxAreas` cai para `1`.
3. A tela de Recrutamento ganha as seções para configurar tudo isso.

Decisões de produto já fechadas: ver seção "Decisões" da spec canônica.

---

## Mudanças

### `shared/src/panel.ts`

```ts
export type PanelKind = "buttons" | "select" | "text";
```

- `text`: mensagem informativa; `buttons` pode ter `0..25` itens;
  `select` fica `null`.
- Nenhum outro tipo muda. `layout` (`embed`/`container`), `color`, `emoji`
  dos botões continuam válidos para `text`.

### `shared/src/panel-validation.ts`

- `kind === "text"`: **não** exigir `buttons.length >= 1`. Restante das
  regras de botão (label/emoji/style/action) continua igual quando houver
  botões.
- `kind === "text"` com `select != null` → erro.

### `shared/src/recruitment-config.ts`

Tipos novos (espelho exato do bot):

```ts
export interface RecruitmentVerificationTicketConfig {
  parentChannelId: string | null;
  threadNameTemplate: string; // vars: {user} {date} {shortid}
  openMessage: string; // vars: {user} {recruiter}
  escalationMessage: string; // vars: {user}
  closeMessage: string; // vars: {user} {closer}
  escalateAfterMinutes: number; // default 60
  recruiterPickerPlaceholder: string;
  noRecruiterLabel: string;
}

export interface RecruitmentRouteConfig {
  sheetChannelId: string | null;
  approverRoleIds: string[];
}
```

`RecruitmentFlowConfig` ganha:

```ts
verificationTicket: RecruitmentVerificationTicketConfig;
familyAreaId: string | null;
familyRoute: RecruitmentRouteConfig;   // ficha → Founders ("Verificação das Posses")
areaRoute: RecruitmentRouteConfig;     // ficha → liderança de REC
pointsResetRoleIds: string[];          // /pontos-resetar; vazio = cai em pointsGrantRoleIds
blockedAlreadyInFamilyMessage: string; // bloqueio do /recrutar p/ quem já entrou na família
```

`DEFAULT_RECRUITMENT_FLOW_CONFIG`:

- `maxAreas: 1` (era `2`);
- `familyAreaId: null`;
- `familyRoute` / `areaRoute`: `{ sheetChannelId: null, approverRoleIds: [] }`;
- `pointsResetRoleIds: []`;
- `blockedAlreadyInFamilyMessage: "Este membro já entrou na família e não pode ser recrutado de novo para ela."`;
- `verificationTicket`: `parentChannelId: null`, templates PT-BR padrão
  (`threadNameTemplate: "verificacao-{user}-{shortid}"`,
  `openMessage: "Olá {user}! Um recrutador vai te atender por aqui."`,
  `escalationMessage: "{user} está aguardando há mais de 1h — alguém pode dar continuidade?"`,
  `closeMessage: "Ticket de {user} encerrado por {closer}."`,
  `escalateAfterMinutes: 60`,
  `recruiterPickerPlaceholder: "Veio por alguém?"`,
  `noRecruiterLabel: "❌ Nenhum — entrei por conta própria"`).

Regra de rota (aplicada pelo bot, documentar aqui): área cujo `id ==
familyAreaId` marcada no `/recrutar` → rota Família; senão → rota Área.

`sheet.channelId` e o `approverRoleIds` do topo **continuam no tipo** como
fallback de recrutamentos legados — não remover nesta entrega.

### `shared/src/recruitment-config-api.ts`

Validação nova no padrão de `panel-validation.ts`:

- `verificationTicket.parentChannelId`: snowflake ou `null`;
- `threadNameTemplate` 1..100, `openMessage` / `escalationMessage` /
  `closeMessage` 1..2000, `recruiterPickerPlaceholder` 1..150,
  `noRecruiterLabel` 1..100;
- `blockedAlreadyInFamilyMessage` 1..2000;
- `escalateAfterMinutes` inteiro 5..1440;
- `familyAreaId`: `null` **ou** um `id` presente em `areas`;
- `familyRoute` / `areaRoute`: `sheetChannelId` snowflake ou `null`;
  `approverRoleIds` lista de snowflakes (pode ser vazia = rota não
  configurada, o bot responde `notConfiguredMessage`);
- `pointsResetRoleIds`: lista de snowflakes, pode ser vazia;
- `maxAreas`: manter `1 <= minAreas <= maxAreas <= min(25, areas.length)`.

### `server/src/firestore/recruitment-config-repository.ts`

- Ler/gravar os campos novos.
- `normalize...`: quando o documento não tiver os campos, preencher com o
  default (mesma estratégia de `normalizeGuildConfig`) para a tela mostrar
  o valor efetivo antes de o bot rodar.
- `familyAreaId` que aponta para uma área que foi apagada → normalizar
  para `null` na leitura.

### `server/src/routes/recruitment-config.ts`

Sem rota nova — o `PUT` de `recruitmentConfigs` já cobre o documento
inteiro. Só passa a validar e persistir os campos novos.

### `client/src/routes/RecruitmentConfigPage.tsx` + editores

Seções novas na tela de Recrutamento:

1. **Ticket de verificação** — canal-pai (select de canais de texto),
   template do nome da thread, mensagem de abertura, de escalonamento e de
   encerramento, minutos até escalar, placeholder do "Veio por alguém?",
   label do "Nenhum". Aviso: "a lista de recrutadores é montada
   automaticamente pelos membros com o cargo de Recrutador".
2. **Rota da ficha** — seletor de qual área é a **Família**
   (`familyAreaId`, dropdown das `areas` cadastradas + "nenhuma"), e dois
   blocos:
   - **Família → Verificação das Posses (Founders)**: canal da ficha +
     cargos que confirmam.
   - **Área → Liderança de REC**: canal da ficha + cargos que confirmam.
     Aviso de escopo (já existe na página): salvar vale só para
     recrutamentos novos.
3. **Reset de pontos** — cargos que podem rodar `/pontos-resetar`
   (`pointsResetRoleIds`); texto auxiliar "vazio = usa os mesmos cargos de
   dar pontos".
4. **Mensagens de bloqueio** — junto das que já existem
   (`notRecruiterMessage` etc.), adicionar `blockedAlreadyInFamilyMessage`.
5. `maxAreas`: o controle já existe; só muda o default para `1`.

Convenção mantida: só config de negócio e superfícies de mensagem entram
aqui. Feedback inline dos comandos, nomes de evento de log e o rank base
(`hierarchyRoles`, editado direto no Firestore) continuam fora da
plataforma — ver seção "1.1. Configurabilidade" da spec canônica.

Editor de painel (`client/src/panel-editor/` + `PanelCreatePage` /
`PanelEditPage`):

- adicionar a opção **"Somente texto"** ao seletor de `kind`
  (hoje "Botões" / "Dropdown");
- quando `kind === "text"`: esconder o dropdown, deixar a lista de botões
  **opcional** (permitir salvar com zero botões), manter os controles de
  layout, cor e imagem;
- `DiscordPanelPreview` / `RecruitmentPreview`: renderizar `text` como a
  mensagem sem `ActionRow` quando não há botões.

### `README.md` / `AGENTS.md`

- README: seção "Configuração do recrutamento" com os blocos novos; nota
  sobre o painel `text`.
- AGENTS: acrescentar `RecruitmentVerificationTicketConfig`,
  `RecruitmentRouteConfig` e o `kind: "text"` à lista de tipos espelho que
  exigem PR coordenado.

---

## Ordem

1. `shared/` (tipos + validação) — quebra o build dos dois lados se sair
   sozinho, então entra junto com o resto do PR.
2. `server/` (repository + rota).
3. `client/` (tela de Recrutamento + editor de painel + previews).
4. README / AGENTS.
5. Só depois: PR do `dragonsbot` consumindo os campos.

---

## Validação

`npm run check` (format:check + lint + typecheck + build). Sem suíte
automatizada nesta fase. Teste manual da tela depende de credenciais reais
(Discord OAuth + Firestore) — reportar como **não executado** se faltarem.
