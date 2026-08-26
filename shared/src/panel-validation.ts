import type { PanelButtonConfig, PanelButtonStyle } from "./panel.js";
import type { PanelButtonInput } from "./panel-api.js";

/**
 * Limites reais impostos pelo Discord para embeds e botoes. Violar estes
 * limites faz a publicacao falhar la na frente (fase 4) — por isso sao
 * validados aqui, no momento da edicao, e nao so no client.
 */
export const PANEL_LIMITS = {
  TITLE_MAX: 256,
  DESCRIPTION_MAX: 4096,
  BUTTON_LABEL_MAX: 80,
  BUTTON_RESPONSE_MAX: 2000,
  MAX_BUTTONS: 25,
  ID_MAX: 40
} as const;

export const PANEL_ID_PATTERN = /^[a-z0-9-]{1,40}$/;

const VALID_BUTTON_STYLES: readonly PanelButtonStyle[] = [
  "Primary",
  "Secondary",
  "Success",
  "Danger"
];

/**
 * Gera um slug a partir de um texto livre — MESMO algoritmo de
 * `dragonsbot/src/commands/painel.ts` (`slugify`). Precisa continuar
 * identico nos dois repositorios: e usado tanto para o id do painel quanto
 * para o id de um botao (que vira parte do `custom_id` publicado no
 * Discord).
 */
export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, PANEL_LIMITS.ID_MAX);
}

/** Valida o id de um painel (slug, 1-40 caracteres). Retorna a mensagem de erro em portugues, ou `null` se valido. */
export function validatePanelId(id: string): string | null {
  if (!PANEL_ID_PATTERN.test(id)) {
    return "O identificador do painel deve ter de 1 a 40 caracteres, usando apenas letras minúsculas, números e hífen.";
  }
  return null;
}

export function validateTitle(title: string): string | null {
  if (!title.trim()) {
    return "O título do painel não pode ficar vazio.";
  }
  if (title.length > PANEL_LIMITS.TITLE_MAX) {
    return `O título não pode ultrapassar ${PANEL_LIMITS.TITLE_MAX} caracteres (atual: ${title.length}).`;
  }
  return null;
}

export function validateDescription(description: string): string | null {
  if (!description.trim()) {
    return "A descrição do painel não pode ficar vazia.";
  }
  if (description.length > PANEL_LIMITS.DESCRIPTION_MAX) {
    return `A descrição não pode ultrapassar ${PANEL_LIMITS.DESCRIPTION_MAX} caracteres (atual: ${description.length}).`;
  }
  return null;
}

/** Valida a URL de imagem do painel. Aceita qualquer host http(s) — o usuário cola links de CDNs externos. */
export function validateImageUrl(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return "A URL da imagem não é válida.";
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return "A URL da imagem precisa começar com http:// ou https://.";
  }
  return null;
}

/**
 * Detecta links de anexo do Discord, que expiram em ~24h — a imagem some
 * do painel depois disso. Usado pelo editor para exibir um aviso destacado
 * ao colar um desses links.
 */
export function isEphemeralDiscordAttachmentUrl(url: string): boolean {
  return /cdn\.discordapp\.com\/attachments\/|ephemeral-attachments/i.test(url);
}

/** Valida o array completo de botoes de um painel (limite de quantidade + cada campo). */
export function validateButtons(buttons: readonly PanelButtonInput[]): string | null {
  if (buttons.length > PANEL_LIMITS.MAX_BUTTONS) {
    return `Um painel pode ter no máximo ${PANEL_LIMITS.MAX_BUTTONS} botões (5 linhas de 5).`;
  }

  for (const button of buttons) {
    const label = button.label.trim();
    if (!label) {
      return "Todo botão precisa de um texto (label).";
    }
    if (button.label.length > PANEL_LIMITS.BUTTON_LABEL_MAX) {
      return `O texto do botão "${label.slice(0, 24)}" não pode ultrapassar ${PANEL_LIMITS.BUTTON_LABEL_MAX} caracteres (atual: ${button.label.length}).`;
    }
    if (!button.response.trim()) {
      return `O botão "${label}" precisa de uma resposta.`;
    }
    if (button.response.length > PANEL_LIMITS.BUTTON_RESPONSE_MAX) {
      return `A resposta do botão "${label}" não pode ultrapassar ${PANEL_LIMITS.BUTTON_RESPONSE_MAX} caracteres (atual: ${button.response.length}).`;
    }
    if (!VALID_BUTTON_STYLES.includes(button.style)) {
      return `O botão "${label}" tem um estilo de cor inválido.`;
    }
  }

  return null;
}

/**
 * Resolve os ids finais do array de botoes ao salvar uma edicao.
 *
 * Regra critica: o id de um botao e gerado UMA VEZ, na criacao, a partir
 * do label (mesmo algoritmo de `dragonsbot/src/commands/painel.ts`). Ele
 * vira parte do `custom_id` (`panel:{panelId}:{buttonId}`) de mensagens ja
 * publicadas no Discord — se o id mudasse quando o label e editado, os
 * botoes dessas mensagens parariam de responder.
 *
 * Por isso: um botao so mantem seu id se o id enviado pelo client
 * corresponder a um botao que ja existia neste painel (`existingButtons`,
 * o estado atual no Firestore). Qualquer outro caso (botao novo, ou um id
 * que o client mandou mas que nao existe de fato) gera um id novo a partir
 * do label atual. Colisoes de slug dentro do array final sao resolvidas
 * com sufixo `-2`, `-3`, etc.
 */
export function assignButtonIds(
  existingButtons: readonly PanelButtonConfig[],
  inputs: readonly PanelButtonInput[]
): PanelButtonConfig[] {
  const existingIds = new Set(existingButtons.map((button) => button.id));
  const usedIds = new Set<string>();

  return inputs.map((input, index) => {
    let id = input.id && existingIds.has(input.id) && !usedIds.has(input.id) ? input.id : undefined;

    if (!id) {
      const base = slugify(input.label) || "botao";
      id = base;
      let suffix = 2;
      while (usedIds.has(id)) {
        id = `${base}-${suffix}`;
        suffix += 1;
      }
    }

    usedIds.add(id);
    return {
      id,
      label: input.label,
      emoji: input.emoji,
      style: input.style,
      response: input.response,
      order: index
    };
  });
}
