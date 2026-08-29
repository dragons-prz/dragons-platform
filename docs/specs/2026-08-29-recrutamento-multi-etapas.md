# Configuração do recrutamento em 3 etapas (lado da plataforma)

Data: 2026-08-29
Status: Planejado. Spec canônica (fluxo completo, tipos e contrato) em
`dragonsbot/docs/specs/2026-08-29-recrutamento-multi-etapas.md`.

Este arquivo é o recorte do que muda **neste repositório**. Entrega em **1 PR**
aqui + 1 PR no `dragonsbot`; este vai primeiro.

## Ideia

O `/recrutar` do bot vira um wizard de 3 etapas (cargo de iniciante → até N
áreas → confirmação) que termina numa ficha postada em canal, aprovada ou
rejeitada por cargos de gerência. **Nada disso é configurável por comando**: a
única fonte de configuração é esta plataforma, escrevendo
`recruitmentConfigs/{guildId}` no mesmo Firestore que o bot lê.

Dois requisitos moldam a UI:

1. **Cada etapa é personalizável** — título, descrição, cor, imagem, labels de
   botão e **emoji** de cada botão/opção. Emojis serão adicionados depois, sem
   tocar em código.
2. **As mensagens seguem o mesmo modelo dos painéis** — cada etapa tem
   `layout: "embed" | "container"`, exatamente como `PanelConfig.layout`
   (ver `2026-08-27-painel-layout-container-e-emoji.md`). Container é o layout
   que renderiza emoji customizado no título.

**Diferença importante em relação aos painéis**: painel publicado é reposto
quando o layout muda; aqui não. O bot congela a configuração no momento do
`/recrutar`, então **salvar mudanças no painel afeta só recrutamentos novos** —
wizards em andamento e fichas já postadas continuam no formato em que nasceram.
A UI precisa comunicar isso (ver "Aviso de escopo" abaixo).

## Mudanças

### `shared/src/recruitment-config.ts` (novo)

Espelho exato de `dragonsbot/src/domain/types.ts`:
`RecruitmentMessageConfig`, `RecruitmentButtonConfig`,
`RecruitmentSelectConfig`, `RecruitmentStarterRoleOption`,
`RecruitmentAreaOption`, `RecruitmentStepOneConfig`/`Two`/`Three`,
`RecruitmentOutcomeConfig`, `RecruitmentSheetConfig`,
`RecruitmentPointsMode`, `RecruitmentAvatarPlacement`,
`RecruitmentFlowConfig`, mais `DEFAULT_RECRUITMENT_FLOW_CONFIG`.

`RecruitmentMessageConfig`/`RecruitmentButtonConfig` reusam `PanelLayout` e
`PanelButtonStyle` de `shared/src/panel.ts` — não duplicar esses dois tipos.

Vale a regra crítica do `AGENTS.md`: mudança de forma nesses tipos = PR
coordenado nos dois repos, no mesmo dia.

`recruitmentDrafts` e os campos novos de `recruitments` são escrita exclusiva
do bot — não tipar aqui até existir dashboard que os leia.

### `shared/src/recruitment-config-api.ts` (novo)

Payload de `PUT` + validação no padrão de `panel-validation.ts`:

- `starterRoles` / `areas`: `id` slug único e não vazio, `label` 1..100,
  `description` ≤ 100, `roleId`/`roleIds` não vazios, `points >= 0`,
  `order` contíguo, no máximo 25 opções (limite de select do Discord);
- `1 <= minAreas <= maxAreas <= min(25, areas.length)`;
- `pointsMode ∈ {"sum","highest"}` (default `"sum"`);
- `minManualPoints <= 0 <= maxManualPoints`;
- `draftTtlMinutes` 1..1440;
- toda `RecruitmentMessageConfig`: `layout ∈ {"embed","container"}`,
  `title` 1..256, `description` ≤ 4000, `color` hex válido ou `null`,
  `imageUrl` http(s) ou `null`;
- toda `RecruitmentButtonConfig`: `label` 0..80, `style` válido, `emoji`
  unicode ou `<a?:nome:id>`; **label vazio só é aceito com emoji** (os botões
  da ficha são só ✅ / ❌) e os dois vazios é erro;
- **emoji customizado tem que ser `<:nome:id>`** — `:shortcode:` é rejeitado com
  mensagem explícita, porque a API do Discord não resolve shortcode e ele
  apareceria como texto cru na mensagem (erro visível na implementação de
  referência);
- `placeholder` de select ≤ 150;
- variáveis de template desconhecidas (`{foo}`) viram **aviso**, não erro — o
  bot deixa intacto o que não casar (`renderTemplate`).

### `server/src/firestore/recruitment-config-repository.ts` (novo)

`getRecruitmentConfig(guildId)` / `putRecruitmentConfig(guildId, payload)` em
`recruitmentConfigs/{guildId}`, aplicando os mesmos defaults do bot para campo
ausente — documento parcial nunca pode quebrar o bot.

### `server/src/routes/recruitment-config.ts` (novo)

`GET` e `PUT /api/recruitment-config`, mesma sessão/guarda de permissão das
rotas de `config.ts`. Logs `recruitment_config.read` /
`recruitment_config.updated`.

### `client/src/routes/RecruitmentConfigPage.tsx` (novo) + rota no `App.tsx`

Seções:

1. **Cargos de iniciante** — lista ordenável (label, descrição, emoji, cargo),
   com os 6 defaults (Mystic, Revenge, Swag, Lotus, Hope, Delusions) como seed.
2. **Áreas** — mesma lista, mas com **múltiplos** cargos por área e um campo de
   pontos (defaults: Família = Novato + Dragons Member, 6 pts; Recrutamento =
   Recrutador, 8 pts; Passtime 0; Suporte 0).
3. **Etapas 1, 2 e 3** — uma aba/accordion por etapa, cada uma com o **editor
   de mensagem** (layout embed/container, título, descrição com as variáveis,
   cor, imagem) + os botões daquela etapa (label, emoji, estilo) + o
   placeholder do dropdown.
4. **Ficha** — canal de destino, editor de mensagem, botões Confirmar/Rejeitar,
   os três estados de desfecho (enfileirada, aprovada, rejeitada), posição do
   avatar, "marcar cargos aprovadores ao postar".
5. **Cargos e pontuação** — cargos aprovadores, cargos que podem dar pontos,
   `pointsMode`, limites do comando manual.
6. **Mensagens de erro** — os textos efêmeros (`notRecruiterMessage`,
   `notApproverMessage`, `notDraftOwnerMessage`, `notConfiguredMessage`).

Transversal:

- **Preview** fiel à referência: layout container com barra de accent, título
  em `##`, uma linha por campo (`{emoji} **Label:** valor`), avatar do recrutado
  como thumbnail à direita quando `avatarPlacement: "thumbnail"`, e botões que
  aceitam só emoji. Reusa `client/src/discord-preview`,
  reaproveitando os componentes do editor de painel (que já sabem renderizar
  embed **e** container).
- **Ajuda de variáveis** ao lado do campo de descrição (`{recruited}`,
  `{recruiter}`, `{role}`, `{areas}`, `{step}`, `{total}`, `{max}`,
  `{points}`, `{createdAt}`, `{approver}`) — inserção por clique.
- **"Restaurar padrão"** por campo e por seção.
- **Aviso de escopo** ao salvar: "as mudanças valem para os próximos
  recrutamentos; wizards em andamento e fichas já enviadas mantêm o formato
  atual". Sem botão de "republicar" — diferente do editor de painel, aqui não
  existe mensagem publicada para atualizar.
- **Aviso de layout no wizard**: as três etapas e os desfechos vivem na _mesma_
  mensagem, editada a cada passo, e o Discord não deixa editar uma mensagem
  alternando entre embed e Components V2. Por isso o layout da **etapa 1** vale
  para todas as mensagens do wizard; o bot normaliza a divergência e loga
  `recruitment.layout_normalized`. A ficha é outra mensagem e tem layout
  próprio (que também manda nos seus estados enfileirada/aprovada/rejeitada).
  A UI mostra isso ao lado do seletor de formato das etapas 2, 3 e desfechos.

Os pickers de cargo/canal já existem para `SettingsPage` e para as categorias
de suporte — reusar, não duplicar.

### `README.md` / `AGENTS.md`

Coleção `recruitmentConfigs` na lista de coleções e na regra de espelho de
tipos.

## Ordem

Este PR entra **antes** do PR do `dragonsbot`, para existir configuração real
com que testar o fluxo. Os tipos das duas pontas precisam ser idênticos.

## Pós-implementação: remoção de `recruitmentCreditWindowHours`

Depois de mergeado, um bug relatado no bot expôs que a janela de crédito
(`credit-window-hours`, default 24h) bloqueava o caso de uso real do fluxo
novo: recrutar alguém que já está no servidor para uma área nova (não
necessariamente a família). Como toda ficha já passa por aprovação manual de
um cargo aprovador, a janela era redundante — decisão: **removida**, não só
desativada.

Removido daqui: `NumberConfigKey["credit-window-hours"]`,
`GUILD_CONFIG_DEFAULTS.recruitmentCreditWindowHours` e
`GuildConfig.recruitmentCreditWindowHours` (`shared/src/guild-config.ts`),
`EDITABLE_NUMBER_KEYS`/`UpdateGuildConfigRequest.recruitmentCreditWindowHours`
(`shared/src/guild-config-api.ts`), o default e a chave gravável em
`server/src/firestore/guild-config-repository.ts`, e o campo "Janela de
crédito (horas)" em `client/src/routes/SettingsPage.tsx`. Espelho exato do
que saiu de `dragonsbot/src/domain/types.ts` e
`FirestoreDragonsStore.ts` — ver a spec canônica.

Documentos antigos em `guildConfigs/{guildId}` continuam com o campo gravado
no Firestore (sem migração); é inofensivo, nenhum dos dois lados o lê mais.

## Validação

`npm run check` (format + lint + typecheck + build). Sem suíte automatizada;
teste manual do `PUT` depende de `.env` com credenciais reais de Discord +
service account do Firestore.
