# Painel: layout Container (Components V2) + emoji na descrição

Data: 2026-08-27
Status: Em implementação (par coordenado: `dragonsbot#feat/painel-layout-container` + `dragons-platform#feat/painel-layout-container`).
Depende de: `2026-08-27-painel-acoes-e-ticket-suporte.md` (mergeado — #16 / dragonsbot#13).

## Contexto

Dois pedidos que se resolvem juntos, olhando o painel de referência
"Suporte Pureza":

1. **Emoji no "título" e banner no topo.** Num `EmbedBuilder` isso é
   impossível: `embed.image` renderiza sempre embaixo, e `embed.title` não
   processa emoji customizado do servidor (só unicode). O painel de
   referência não é um embed — é **Components V2** (`ContainerBuilder`).
2. **Seletor de emoji** onde ele de fato ajuda.

## Fase 1 — layout `container`

### Espelho (`dragonsbot/src/domain/types.ts` + `shared/src/panel.ts`)

```ts
export type PanelLayout = "embed" | "container"; // ausente = "embed"
// em PanelConfig:
layout: PanelLayout;
```

Nenhum outro campo muda: `title`/`description`/`imageUrl`/`color`/`kind`/
`buttons`/`select` são reaproveitados. No `container`:

- `imageUrl` → `MediaGallery` (banner **no topo**);
- `title` + `description` → um `TextDisplay` com markdown (`## {title}\n{description}`)
  — emoji de qualquer tipo, em qualquer lugar;
- `color` → `container.setAccentColor(...)` (a barra lateral);
- botões/select → `ActionRow`(s) dentro do container.

Mensagem enviada com `flags: MessageFlags.IsComponentsV2` e **sem**
`embeds`/`content`.

### Contrato

- `shared/src/panel-api.ts`: `UpdatePanelRequest.layout?: PanelLayout`.
- `shared/src/panel-validation.ts`: `validatePanelLayout(layout, { title, description })`
  — valida o enum e, para `container`, o limite combinado título+descrição
  (`PANEL_LIMITS.CONTAINER_TEXT_MAX = 3900`, folga sobre o teto de 4000 do
  `TextDisplay`).

### Bot

- `buildPanelMessage` (`commands/painel.ts`): fatorado em
  `buildPanelComponentRows` (comum) + ramo `layout === "container"` que
  monta o `ContainerBuilder`. Respostas efêmeras de botão/opção continuam
  embed.
- **Pegadinha:** a flag `IsComponentsV2` **não pode ser ligada/desligada
  editando** uma mensagem publicada. `publishPanelToChannel` compara
  `existingMessage.flags.has(IsComponentsV2)` com o layout desejado; se
  divergir, **apaga e reposta** em vez de editar (evento
  `panel.layout_reposted`; o `panelJob` fica `published`, não `updated`).
- `FirestoreDragonsStore`: `mapPanel` faz backfill `layout ?? "embed"`;
  `createPanel` grava `layout: "embed"`.

### Server (dragons-platform)

- `panel-repository.ts`: `normalizePanel`/`createPanel`/`updatePanel` com
  `layout`.
- `routes/panels.ts`: aceita `body.layout`; valida com
  `validatePanelLayout` usando título/descrição finais.

### Client

- `PanelEditPage`: toggle **Embed / Container (banner no topo)**; `layout`
  no form/save/preview; aviso de que trocar o layout de um painel publicado
  reposta a mensagem.
- `DiscordPanelPreview`: no modo `container`, imagem full-width no topo,
  título maior renderizado com `renderDiscordText` (emoji), depois
  descrição, mantendo a barra de acento.

## Fase 1b — seletor de emoji

- **Descrição do painel (embed description)**: `EmojiPicker` +
  `useCursorInsert` no textarea. O embed description renderiza emoji
  customizado, então o seletor evita o erro de `:nome:` solto.
- **Campo `emoji` de cada opção do dropdown**: `EmojiPicker` no slot
  dedicado (mesmo padrão do `ButtonEditor`).
- **Não** na *descrição* da opção do dropdown nem no título de embed: são
  texto puro no Discord, emoji customizado não renderiza.

## Fora de escopo

Separadores/seções/thumbnail no container, escolher posição da imagem em
modo embed (o Discord não permite), CV2 nas respostas efêmeras.
