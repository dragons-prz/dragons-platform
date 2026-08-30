import type {
  PanelBlock,
  PanelBlockInput,
  PanelConfig,
  PanelSeparatorSpacing
} from "@dragons/shared";

import { createLocalButtonId, emptyReplyAction } from "./types";
import type { LocalButton, LocalSelectOption } from "./types";

/**
 * Estado local (no editor) de um bloco de painel. `key` e so para o React.
 * Ids de botao/opcao seguem a mesma regra de `LocalButton` — so existem
 * depois do primeiro save.
 */
export type LocalBlock =
  | { key: string; type: "text"; content: string }
  | { key: string; type: "image"; url: string }
  | { key: string; type: "separator"; divider: boolean; spacing: PanelSeparatorSpacing }
  | { key: string; type: "buttons"; buttons: LocalButton[] }
  | { key: string; type: "select"; placeholder: string; options: LocalSelectOption[] };

export type LocalBlockType = LocalBlock["type"];

const DEFAULT_PLACEHOLDER = "Selecione uma opção!";

export function newLocalBlock(type: LocalBlockType): LocalBlock {
  const key = createLocalButtonId();
  if (type === "text") return { key, type, content: "Texto novo." };
  if (type === "image") return { key, type, url: "" };
  if (type === "separator") return { key, type, divider: true, spacing: "small" };
  if (type === "buttons") {
    return {
      key,
      type,
      buttons: [
        {
          key: createLocalButtonId(),
          label: "Botão",
          emoji: null,
          style: "Secondary",
          response: "",
          responseImageUrl: null,
          responseColor: null,
          action: emptyReplyAction()
        }
      ]
    };
  }
  return { key, type, placeholder: DEFAULT_PLACEHOLDER, options: [] };
}

export function toLocalBlocks(panel: PanelConfig): LocalBlock[] {
  return panel.blocks.map((block): LocalBlock => {
    const key = createLocalButtonId();
    if (block.type === "text") return { key, type: "text", content: block.content };
    if (block.type === "image") return { key, type: "image", url: block.url };
    if (block.type === "separator") {
      return { key, type: "separator", divider: block.divider, spacing: block.spacing };
    }
    if (block.type === "buttons") {
      return {
        key,
        type: "buttons",
        buttons: [...block.buttons]
          .sort((a, b) => a.order - b.order)
          .map((button) => ({
            key: button.id,
            id: button.id,
            label: button.label,
            emoji: button.emoji,
            style: button.style,
            response: button.response,
            responseImageUrl: button.responseImageUrl,
            responseColor: button.responseColor,
            action: button.action
          }))
      };
    }
    return {
      key,
      type: "select",
      placeholder: block.placeholder,
      options: [...block.options]
        .sort((a, b) => a.order - b.order)
        .map((option) => ({
          key: option.id,
          id: option.id,
          label: option.label,
          description: option.description,
          emoji: option.emoji,
          action: option.action
        }))
    };
  });
}

/** Corpo do `PATCH /api/panels/:id` — o servidor decide os ids finais. */
export function toBlockInputs(blocks: LocalBlock[]): PanelBlockInput[] {
  return blocks.map((block): PanelBlockInput => {
    if (block.type === "text") return { type: "text", content: block.content };
    if (block.type === "image") return { type: "image", url: block.url };
    if (block.type === "separator") {
      return { type: "separator", divider: block.divider, spacing: block.spacing };
    }
    if (block.type === "buttons") {
      return {
        type: "buttons",
        buttons: block.buttons.map((button) => ({
          id: button.id,
          label: button.label,
          emoji: button.emoji,
          style: button.style,
          response: button.response,
          responseImageUrl: button.responseImageUrl,
          responseColor: button.responseColor,
          action: button.action
        }))
      };
    }
    return {
      type: "select",
      placeholder: block.placeholder,
      options: block.options.map((option) => ({
        id: option.id,
        label: option.label,
        description: option.description,
        emoji: option.emoji,
        action: option.action
      }))
    };
  });
}

/** Blocos ja no formato `PanelBlock` (com `order`/`id`) para a prévia. */
export function toPreviewBlocks(blocks: LocalBlock[]): PanelBlock[] {
  return blocks.map((block): PanelBlock => {
    if (block.type === "text") return { type: "text", content: block.content };
    if (block.type === "image") return { type: "image", url: block.url };
    if (block.type === "separator") {
      return { type: "separator", divider: block.divider, spacing: block.spacing };
    }
    if (block.type === "buttons") {
      return {
        type: "buttons",
        buttons: block.buttons.map((button, index) => ({
          id: button.id ?? button.key,
          label: button.label,
          emoji: button.emoji,
          style: button.style,
          response: button.response,
          responseImageUrl: button.responseImageUrl,
          responseColor: button.responseColor,
          action: button.action,
          order: index
        }))
      };
    }
    return {
      type: "select",
      placeholder: block.placeholder,
      options: block.options.map((option, index) => ({
        id: option.id ?? option.key,
        label: option.label,
        description: option.description,
        emoji: option.emoji,
        action: option.action,
        order: index
      }))
    };
  });
}
