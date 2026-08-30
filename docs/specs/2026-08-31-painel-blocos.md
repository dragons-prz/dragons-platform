# Painel em blocos (lado da plataforma)

Data: 2026-08-31
Status: Planejado. Spec canônica (modelo, render, migração) em
`dragonsbot/docs/specs/2026-08-31-painel-blocos.md`. Protótipo: artifact
"Painel em Blocos".

Recorte do que muda **neste repositório**. Entrega em **2 PRs
coordenados**: este primeiro, o do `dragonsbot` depois. `PanelBlock` e
companhia em `shared/src/panel.ts` são espelho de
`dragonsbot/src/domain/types.ts`.

---

## Ideia

O painel deixa de ter `layout`/`title`/`description`/`imageUrl`/`buttons`/
`select` no topo e passa a ser `blocks: PanelBlock[]` — texto, imagem
(banner), separador, botões e (≤1) dropdown, em qualquer ordem, sempre
renderizado como Container (Components V2). O editor vira um editor de
blocos com arrastar-para-reordenar. O layout `embed` é removido.

Todos os painéis existentes já são Container → migração só reempacota os
campos legados em blocos, na leitura. Sem script.

---

## `shared/src/panel.ts`

Adicionar `PanelBlockType`, `PanelSeparatorSpacing`, `PanelTextBlock`,
`PanelImageBlock`, `PanelSeparatorBlock`, `PanelButtonsBlock`,
`PanelSelectBlock`, `PanelBlock` (ver spec canônica, seção 2).

`PanelConfig`: `blocks: PanelBlock[]` + `color: string | null` + campos de
publicação; `title`/`description`/`imageUrl`/`kind`/`layout`/`buttons`/
`select` viram **opcionais legados** (comentário: só a migração de leitura
os usa). `PanelButtonConfig`/`PanelSelectOption`/`PanelSelectConfig` /
`PanelActionConfig` inalterados.

## `shared/src/panel-api.ts`

- `PanelBlockInput` (espelho de `PanelBlock`, mas `buttons`/`select`
  aceitam `PanelButtonInput`/`PanelSelectOptionInput` sem `id`).
- `CreatePanelRequest = { id, title }` (cria `[{type:"text",
content:"## "+title}]`).
- `UpdatePanelRequest = { color?: string | null; blocks?: PanelBlockInput[] }`.
  Some `kind`/`layout`/`buttons`/`select`/`title`/`description`/`imageUrl`.

## `shared/src/panel-validation.ts`

- `validateBlocks(blocks)`:
  - `1..12` blocos; array não vazio para publicar.
  - `text`: `content` 1..3900 (limite do TextDisplay do Container).
  - `image`: `url` http(s) válida (reusa `validateImageUrl`).
  - `separator`: `divider` boolean, `spacing ∈ {"small","large"}`.
  - `buttons`: `1..25` no bloco; soma de todos os blocos `buttons` ≤ 25;
    cada botão pela regra atual (`validateButtons` reaproveitado por bloco,
    sem o teto de 25 por bloco — o teto passa a ser global).
  - `select`: no máximo **1 bloco** `select` no painel; `placeholder`
    1..150; `1..25` opções; cada opção pela regra atual.
- `assignBlockIds(existingBlocks, inputBlocks)`: percorre os blocos e
  aplica `assignButtonIds`/`assignSelectOptionIds` **com escopo do painel
  inteiro** (um `Set` de ids compartilhado entre todos os blocos `buttons`,
  outro entre as opções do bloco `select`), preservando ids que já
  existiam. Substitui os `assignButtonIds`/`assignSelectIds` chamados hoje
  no route.
- `validatePanelLayout` e `PANEL_LIMITS.CONTAINER_TEXT_MAX` continuam (o
  bloco de texto usa o mesmo teto).

## `server/src/firestore/panel-repository.ts`

- `mapPanel`: se o doc tem `blocks`, usa; senão monta a partir dos legados
  (spec canônica, seção 3): `image?` → `text(## title[\n\n desc])` →
  `select?` ou `buttons?`.
- `createPanel(id, title)`: grava `blocks: [text]`, `color: null`.
- `updatePanel`: grava `blocks` (via `assignBlockIds`) e `color`; não toca
  nos campos legados.

## `server/src/routes/panels.ts`

- `PATCH /api/panels/:id`: valida `color` + `blocks` (`validateBlocks`),
  aplica `assignBlockIds(existing.blocks, body.blocks)`. Remove os ramos
  `kind`/`layout`/`buttons`/`select`/`title`/`description`/`imageUrl` e a
  checagem de consistência `kind` × conteúdo.
- `assertSupportCategoriesExist`: coletar as ações de
  `blocks.flatMap(b => b.type === "buttons" ? b.buttons.map(resolveButtonAction)
: b.type === "select" ? b.options.map(o => o.action) : [])`.
- `POST /api/panels/:id/publish`: "vazio" = `panel.blocks.length === 0`.
- `POST /api/panels` (criar): body `{ id, title }` → `createPanel`.

## `client/` — editor de blocos

Reescrever `PanelEditPage.tsx` em torno de uma lista de blocos:

- **`BlockListEditor`** (novo): renderiza `blocks[]` como cards
  reordenáveis (drag + setas ↑↓ + remover). **A paleta "Adicionar bloco"
  fica ACIMA da lista, e o bloco novo entra no TOPO** (`unshift`), não no
  fim.
- Editores por tipo:
  - `TextBlockEditor` (novo): `<textarea>` + **barra de formatação**
    (`H` `## `, `B` `**`, `i` `*`, `</>` `` ` ``, `❝` `> `) que
    embrulha/insere no cursor (reusar `useCursorInsert.ts`) + botão de
    emoji que abre o `EmojiPicker` existente **listando só emojis do
    servidor** (já é o comportamento do componente).
  - `ImageBlockEditor` (novo): campo de URL (reusa `ImageUrlField.tsx` /
    aviso de anexo efêmero).
  - `SeparatorBlockEditor` (novo): toggle "linha divisória" + select
    pequeno/grande.
  - `ButtonsBlockEditor`: reusa `ButtonEditorList.tsx` +
    `ButtonConfigEditor`/`ActionEditor`/`EmojiPicker` — opera no
    `buttons[]` do bloco.
  - `SelectBlockEditor`: reusa `SelectOptionEditorList.tsx`. O botão
    "Adicionar bloco › Dropdown" fica desabilitado quando já existe um
    bloco `select`.
- `DiscordPanelPreview.tsx`: iterar `panel.blocks` — `text` (markdown),
  `image` (banner no topo do gap), `separator` (`<hr>` com/sem linha +
  espaçamento), `buttons` (linhas de 5), `select` (dropdown). Remover o
  ramo `layout: "embed"` e o de `kind`.
- `panel-editor/legacy.ts` / `types.ts`: adaptar o `toFormState`/
  `toButtonsInput` para o shape de blocos.
- `PanelCreatePage.tsx`: cria com `{ id, title }` (um bloco de texto).
- `PanelsPage.tsx`: a listagem mostra "N blocos" em vez de "N botões".

Barra de escopo/aviso da página: manter.

## README / AGENTS

- README: seção "Configuração do painel" reescrita para blocos; remover
  menção a `embed`/`kind`.
- AGENTS: `PanelBlock` entra na lista de tipos espelho que exigem PR
  coordenado.

## Ordem

`shared` → `server` → `client` → README/AGENTS. Depois o PR do
`dragonsbot`.

## Validação

`npm run check`. Teste manual da tela depende de credenciais reais — não
executado.
