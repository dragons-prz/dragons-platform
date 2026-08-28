import { PANEL_ACTIONS } from "./panel-actions.js";
import type {
  PanelActionConfig,
  PanelButtonConfig,
  PanelButtonStyle,
  PanelSelectConfig,
  PanelSelectOption
} from "./panel.js";
import type { PanelButtonInput, PanelSelectInput, PanelSelectOptionInput } from "./panel-api.js";

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

export const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

/** Limites do Discord para um menu de selecao (string select). */
export const SELECT_LIMITS = {
  PLACEHOLDER_MAX: 150,
  MAX_OPTIONS: 25,
  OPTION_LABEL_MAX: 100,
  OPTION_DESCRIPTION_MAX: 100
} as const;

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

/** Valida uma cor hexadecimal (ex.: "#E03131"), usada na barra lateral do embed do painel ou de uma resposta de botao. */
export function validateColor(value: string): string | null {
  if (!HEX_COLOR_PATTERN.test(value)) {
    return "A cor deve estar no formato hexadecimal, como #E03131.";
  }
  return null;
}

/**
 * Resolve a acao efetiva de um botao/opcao: quando `action` esta ausente
 * (documento antigo ou input legado), monta uma acao `reply` a partir dos
 * campos legados. MESMA regra do `mapPanelButton` no bot.
 */
export function resolveButtonAction(input: {
  action?: PanelActionConfig;
  response: string;
  responseImageUrl: string | null;
  responseColor: string | null;
}): PanelActionConfig {
  if (input.action) return input.action;
  return {
    type: "reply",
    response: input.response,
    responseImageUrl: input.responseImageUrl,
    responseColor: input.responseColor
  };
}

/**
 * Valida uma `PanelActionConfig`. NAO checa se uma categoria de suporte
 * referenciada existe de fato — isso e feito no servidor, que tem a lista.
 * `label` identifica o item (botao/opcao) na mensagem de erro.
 */
export function validateAction(action: PanelActionConfig, label: string): string | null {
  if (action.type === "reply") {
    if (!action.response.trim()) {
      return `${label}: a resposta não pode ficar vazia.`;
    }
    if (action.response.length > PANEL_LIMITS.BUTTON_RESPONSE_MAX) {
      return `${label}: a resposta não pode ultrapassar ${PANEL_LIMITS.BUTTON_RESPONSE_MAX} caracteres (atual: ${action.response.length}).`;
    }
    if (action.responseImageUrl) {
      const error = validateImageUrl(action.responseImageUrl);
      if (error)
        return `${label} — imagem da resposta: ${error.charAt(0).toLowerCase()}${error.slice(1)}`;
    }
    if (action.responseColor) {
      const error = validateColor(action.responseColor);
      if (error)
        return `${label} — cor da resposta: ${error.charAt(0).toLowerCase()}${error.slice(1)}`;
    }
    return null;
  }

  if (action.type === "run") {
    const spec = PANEL_ACTIONS.find((entry) => entry.id === action.actionId);
    if (!spec) {
      return `${label}: ação "${action.actionId}" desconhecida.`;
    }
    for (const param of spec.params) {
      if (!param.required) continue;
      const value = action.params?.[param.key];
      if (typeof value !== "string" || !value.trim()) {
        return `${label}: o parâmetro "${param.label}" é obrigatório.`;
      }
    }
    return null;
  }

  return `${label}: tipo de ação inválido.`;
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
    if (!VALID_BUTTON_STYLES.includes(button.style)) {
      return `O botão "${label}" tem um estilo de cor inválido.`;
    }
    const actionError = validateAction(resolveButtonAction(button), `Botão "${label}"`);
    if (actionError) return actionError;
  }

  return null;
}

/** Valida o dropdown de um painel do tipo `select`. */
export function validateSelect(select: PanelSelectInput): string | null {
  if (typeof select.placeholder !== "string" || !select.placeholder.trim()) {
    return "O texto de instrução do dropdown não pode ficar vazio.";
  }
  if (select.placeholder.length > SELECT_LIMITS.PLACEHOLDER_MAX) {
    return `O texto de instrução do dropdown não pode ultrapassar ${SELECT_LIMITS.PLACEHOLDER_MAX} caracteres.`;
  }
  if (!Array.isArray(select.options) || select.options.length === 0) {
    return "O dropdown precisa de ao menos uma opção.";
  }
  if (select.options.length > SELECT_LIMITS.MAX_OPTIONS) {
    return `O dropdown pode ter no máximo ${SELECT_LIMITS.MAX_OPTIONS} opções.`;
  }

  for (const option of select.options) {
    const label = option.label.trim();
    if (!label) {
      return "Toda opção do dropdown precisa de um texto (label).";
    }
    if (option.label.length > SELECT_LIMITS.OPTION_LABEL_MAX) {
      return `O texto da opção "${label.slice(0, 24)}" não pode ultrapassar ${SELECT_LIMITS.OPTION_LABEL_MAX} caracteres.`;
    }
    if (option.description && option.description.length > SELECT_LIMITS.OPTION_DESCRIPTION_MAX) {
      return `A descrição da opção "${label}" não pode ultrapassar ${SELECT_LIMITS.OPTION_DESCRIPTION_MAX} caracteres.`;
    }
    const actionError = validateAction(option.action, `Opção "${label}"`);
    if (actionError) return actionError;
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
    const action = resolveButtonAction(input);
    return {
      id,
      label: input.label,
      emoji: input.emoji,
      style: input.style,
      // Campos legados mantidos em sincronia com a acao `reply` para
      // documentos lidos por codigo antigo; para acao `run` ficam vazios.
      response: action.type === "reply" ? action.response : "",
      responseImageUrl: action.type === "reply" ? action.responseImageUrl : null,
      responseColor: action.type === "reply" ? action.responseColor : null,
      action,
      order: index
    };
  });
}

/**
 * Mesma regra de `assignButtonIds`, para as opcoes do dropdown. O id da
 * opcao vira o `value` do select publicado no Discord — se mudasse ao
 * editar o label, a mensagem publicada pararia de casar a opcao escolhida.
 */
export function assignSelectOptionIds(
  existingOptions: readonly PanelSelectOption[],
  inputs: readonly PanelSelectOptionInput[]
): PanelSelectOption[] {
  const existingIds = new Set(existingOptions.map((option) => option.id));
  const usedIds = new Set<string>();

  return inputs.map((input, index) => {
    let id = input.id && existingIds.has(input.id) && !usedIds.has(input.id) ? input.id : undefined;

    if (!id) {
      const base = slugify(input.label) || "opcao";
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
      description: input.description,
      emoji: input.emoji,
      action: input.action,
      order: index
    };
  });
}

/** Resolve os ids finais do dropdown inteiro (placeholder + opcoes). */
export function assignSelectIds(
  existing: PanelSelectConfig | null,
  input: PanelSelectInput
): PanelSelectConfig {
  return {
    placeholder: input.placeholder,
    options: assignSelectOptionIds(existing?.options ?? [], input.options)
  };
}
