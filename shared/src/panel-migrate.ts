/**
 * Migracao de leitura: monta `PanelBlock[]` a partir dos campos legados de
 * um documento `panels/{...}` que ainda nao tem `blocks` (formato antigo:
 * `title`/`description`/`imageUrl`/`kind`/`buttons`/`select` no topo).
 *
 * Usado nos DOIS repos (`mapPanel` no bot, `normalizePanel` aqui) — precisa
 * produzir exatamente a mesma lista dos dois lados. Sem script de migracao:
 * o documento so ganha `blocks` no proximo save.
 */

import type { PanelBlock, PanelButtonConfig, PanelSelectConfig } from "./panel.js";

export interface LegacyPanelFields {
  title?: string;
  description?: string;
  imageUrl?: string | null;
  kind?: string;
  buttons?: PanelButtonConfig[];
  select?: PanelSelectConfig | null;
}

export function panelBlocksFromLegacy(raw: LegacyPanelFields): PanelBlock[] {
  const blocks: PanelBlock[] = [];

  if (raw.imageUrl) {
    blocks.push({ type: "image", url: raw.imageUrl });
  }

  const title = (raw.title ?? "").trim();
  const description = raw.description ?? "";
  const parts: string[] = [];
  if (title) parts.push(`## ${title}`);
  if (description.trim()) parts.push(description);
  if (parts.length > 0) {
    blocks.push({ type: "text", content: parts.join("\n\n") });
  }

  if (raw.kind === "select" && raw.select && (raw.select.options?.length ?? 0) > 0) {
    blocks.push({
      type: "select",
      placeholder: raw.select.placeholder,
      options: raw.select.options
    });
  } else if (raw.buttons && raw.buttons.length > 0) {
    blocks.push({ type: "buttons", buttons: raw.buttons });
  }

  if (blocks.length === 0) {
    blocks.push({ type: "text", content: `## ${title || "Painel"}` });
  }

  return blocks;
}
