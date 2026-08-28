/**
 * Contrato dos endpoints de escrita de categorias de ticket de suporte
 * (`POST /api/support-categories`, `PATCH /api/support-categories/:id`).
 * NAO e espelho de um tipo do bot — e o formato de requisicao especifico do
 * dragons-platform. O documento gravado (`supportCategories/{guildId}_{id}`)
 * segue `SupportCategoryConfig` de `support-category.ts`.
 */

import { DISCORD_SNOWFLAKE_PATTERN } from "./guild-config-api.js";
import { slugify } from "./panel-validation.js";
import type { SupportCategoryCloseAction } from "./support-category.js";

export const SUPPORT_CATEGORY_LIMITS = {
  ID_MAX: 40,
  NAME_MAX: 80,
  THREAD_NAME_TEMPLATE_MAX: 100,
  MESSAGE_MAX: 2000,
  MAX_SUPPORT_ROLES: 10,
  MAX_VIEWER_ROLES: 10
} as const;

export const SUPPORT_CATEGORY_ID_PATTERN = /^[a-z0-9-]{1,40}$/;

const VALID_CLOSE_ACTIONS: readonly SupportCategoryCloseAction[] = ["archive-remove"];

export interface CreateSupportCategoryRequest {
  id: string;
  name: string;
  parentChannelId: string;
}

/** Todos os campos opcionais — envie so o que quer alterar. `id` e imutavel. */
export interface UpdateSupportCategoryRequest {
  name?: string;
  parentChannelId?: string;
  supportRoleIds?: string[];
  viewerRoleIds?: string[];
  threadNameTemplate?: string;
  openMessage?: string;
  claimMessage?: string;
  closeMessage?: string;
  closeAction?: SupportCategoryCloseAction;
}

/** Valores default aplicados ao criar uma categoria (mesmos textos que o bot usa como fallback). */
export const SUPPORT_CATEGORY_DEFAULTS = {
  supportRoleIds: [] as string[],
  viewerRoleIds: [] as string[],
  threadNameTemplateSuffix: "-{user}",
  openMessage: "Ola {user}! Descreva sua solicitacao e aguarde o atendimento da equipe.",
  claimMessage: "{claimer} esta atendendo o ticket de {user}.",
  closeMessage: "Ticket fechado por {closer}. Obrigado pelo contato, {user}.",
  closeAction: "archive-remove" as SupportCategoryCloseAction
} as const;

export function validateSupportCategoryId(id: string): string | null {
  if (!SUPPORT_CATEGORY_ID_PATTERN.test(id)) {
    return "O identificador da categoria deve ter de 1 a 40 caracteres, usando apenas letras minusculas, numeros e hifen.";
  }
  return null;
}

function validateName(name: string): string | null {
  if (!name.trim()) return "O nome da categoria nao pode ficar vazio.";
  if (name.length > SUPPORT_CATEGORY_LIMITS.NAME_MAX) {
    return `O nome nao pode ultrapassar ${SUPPORT_CATEGORY_LIMITS.NAME_MAX} caracteres.`;
  }
  return null;
}

function validateRoleList(ids: unknown, label: string, max: number): string | null {
  if (!Array.isArray(ids)) return `${label}: formato invalido.`;
  if (ids.length > max) return `${label}: no maximo ${max} cargos.`;
  for (const id of ids) {
    if (typeof id !== "string" || !DISCORD_SNOWFLAKE_PATTERN.test(id)) {
      return `${label}: "${String(id)}" nao e um id de cargo valido do Discord.`;
    }
  }
  return null;
}

function validateMessage(value: string, label: string): string | null {
  if (!value.trim()) return `${label} nao pode ficar vazia.`;
  if (value.length > SUPPORT_CATEGORY_LIMITS.MESSAGE_MAX) {
    return `${label} nao pode ultrapassar ${SUPPORT_CATEGORY_LIMITS.MESSAGE_MAX} caracteres.`;
  }
  return null;
}

/**
 * Valida a FORMA do patch (sem checar existencia de canal/cargo na guild —
 * isso e feito no servidor). Retorna a mensagem de erro em portugues, ou
 * `null` se valido.
 */
export function validateSupportCategoryUpdate(patch: UpdateSupportCategoryRequest): string | null {
  let touched = false;

  if (patch.name !== undefined) {
    touched = true;
    const error = validateName(patch.name);
    if (error) return error;
  }

  if (patch.parentChannelId !== undefined) {
    touched = true;
    if (
      typeof patch.parentChannelId !== "string" ||
      !DISCORD_SNOWFLAKE_PATTERN.test(patch.parentChannelId)
    ) {
      return "O canal-pai precisa ser um id de canal de texto valido do Discord.";
    }
  }

  if (patch.supportRoleIds !== undefined) {
    touched = true;
    const error = validateRoleList(
      patch.supportRoleIds,
      "Cargos de suporte",
      SUPPORT_CATEGORY_LIMITS.MAX_SUPPORT_ROLES
    );
    if (error) return error;
  }

  if (patch.viewerRoleIds !== undefined) {
    touched = true;
    const error = validateRoleList(
      patch.viewerRoleIds,
      "Cargos que visualizam",
      SUPPORT_CATEGORY_LIMITS.MAX_VIEWER_ROLES
    );
    if (error) return error;
  }

  if (patch.threadNameTemplate !== undefined) {
    touched = true;
    const value = patch.threadNameTemplate;
    if (!value.trim()) return "O nome do topico nao pode ficar vazio.";
    if (value.length > SUPPORT_CATEGORY_LIMITS.THREAD_NAME_TEMPLATE_MAX) {
      return `O nome do topico nao pode ultrapassar ${SUPPORT_CATEGORY_LIMITS.THREAD_NAME_TEMPLATE_MAX} caracteres.`;
    }
    if (!value.includes("{user}")) {
      return 'O nome do topico precisa conter "{user}" para diferenciar os tickets.';
    }
  }

  for (const [key, label] of [
    ["openMessage", "A mensagem de abertura"],
    ["claimMessage", "A mensagem de atendimento"],
    ["closeMessage", "A mensagem de fechamento"]
  ] as const) {
    const value = patch[key];
    if (value === undefined) continue;
    touched = true;
    const error = validateMessage(value, label);
    if (error) return error;
  }

  if (patch.closeAction !== undefined) {
    touched = true;
    if (!VALID_CLOSE_ACTIONS.includes(patch.closeAction)) {
      return "Acao de fechamento invalida.";
    }
  }

  if (!touched) {
    return "Nenhum campo da categoria para atualizar.";
  }

  return null;
}

/** Sugere um id (slug) a partir do nome — usado pelo formulario de criacao. */
export function suggestSupportCategoryId(name: string): string {
  return slugify(name);
}
