/**
 * Contrato do endpoint de escrita da configuracao de recrutamento
 * (`PUT /api/recruitment-config`).
 *
 * NAO e espelho de um tipo do bot — e o formato de requisicao especifico do
 * dragons-platform. O documento gravado (`recruitmentConfigs/{guildId}`)
 * segue `RecruitmentFlowConfig` de `recruitment-config.ts`.
 *
 * O corpo e o documento INTEIRO (menos os campos gerados pelo servidor),
 * nao um patch: a configuracao e uma arvore profunda, e mesclar patch
 * parcial de sub-objeto daria margem a estado meio-salvo.
 */

import { DISCORD_SNOWFLAKE_PATTERN } from "./guild-config-api.js";
import {
  HEX_COLOR_PATTERN,
  PANEL_LIMITS,
  SELECT_LIMITS,
  validateImageUrl
} from "./panel-validation.js";
import type {
  RecruitmentAreaOption,
  RecruitmentAvatarPlacement,
  RecruitmentButtonConfig,
  RecruitmentFlowConfig,
  RecruitmentMessageConfig,
  RecruitmentPointsMode,
  RecruitmentStarterRoleOption
} from "./recruitment-config.js";

export type UpdateRecruitmentConfigRequest = Omit<
  RecruitmentFlowConfig,
  "guildId" | "createdAt" | "updatedAt"
>;

export const RECRUITMENT_LIMITS = {
  OPTION_ID_MAX: 40,
  /** Limite de opcoes de um dropdown do Discord. */
  MAX_OPTIONS: 25,
  MAX_ROLES_PER_AREA: 10,
  MAX_APPROVER_ROLES: 15,
  MAX_POINTS_PER_AREA: 1000,
  MAX_MANUAL_POINTS: 10000,
  DRAFT_TTL_MIN: 1,
  DRAFT_TTL_MAX: 1440,
  MESSAGE_MAX: 500
} as const;

export const RECRUITMENT_OPTION_ID_PATTERN = /^[a-z0-9-]{1,40}$/;

/** Emoji customizado como o Discord exige de fato: `<:nome:id>` ou `<a:nome:id>`. */
export const CUSTOM_EMOJI_PATTERN = /^<a?:[a-zA-Z0-9_]{2,32}:\d{17,20}>$/;

/** `:nome:` solto — o erro classico: a API nao resolve e vira texto cru. */
const EMOJI_SHORTCODE_PATTERN = /^:[a-zA-Z0-9_]+:$/;

const VALID_POINTS_MODES: readonly RecruitmentPointsMode[] = ["sum", "highest"];
const VALID_AVATAR_PLACEMENTS: readonly RecruitmentAvatarPlacement[] = [
  "thumbnail",
  "image",
  "none"
];
const VALID_BUTTON_STYLES = ["Primary", "Secondary", "Success", "Danger"];
const VALID_LAYOUTS = ["embed", "container"];

/**
 * Valida um emoji de botao/opcao. Aceita vazio (`null`), emoji unicode e o
 * formato completo do Discord; rejeita `:shortcode:` com a explicacao.
 */
export function validateRecruitmentEmoji(emoji: string | null, label: string): string | null {
  if (emoji === null || emoji === "") return null;
  if (typeof emoji !== "string") return `${label}: formato de emoji invalido.`;
  if (CUSTOM_EMOJI_PATTERN.test(emoji)) return null;
  if (EMOJI_SHORTCODE_PATTERN.test(emoji)) {
    return `${label}: "${emoji}" é um atalho de emoji e o Discord não resolve isso — apareceria como texto na mensagem. Escolha o emoji pelo seletor para gravar o formato completo (<:nome:id>).`;
  }
  // Emoji unicode: sem `<` e curto. Tudo que sobra e texto solto.
  if (emoji.includes("<") || emoji.includes(":") || [...emoji].length > 8) {
    return `${label}: "${emoji}" não é um emoji válido. Use um emoji unicode ou escolha um do servidor pelo seletor.`;
  }
  return null;
}

function validateMessage(message: RecruitmentMessageConfig, label: string): string | null {
  if (!message || typeof message !== "object") return `${label}: mensagem ausente.`;
  if (!VALID_LAYOUTS.includes(message.layout)) {
    return `${label}: layout precisa ser "embed" ou "container".`;
  }
  if (!message.title.trim()) return `${label}: o título não pode ficar vazio.`;
  if (message.title.length > PANEL_LIMITS.TITLE_MAX) {
    return `${label}: o título não pode ultrapassar ${PANEL_LIMITS.TITLE_MAX} caracteres.`;
  }
  if (!message.description.trim()) return `${label}: a descrição não pode ficar vazia.`;
  if (message.description.length > PANEL_LIMITS.DESCRIPTION_MAX) {
    return `${label}: a descrição não pode ultrapassar ${PANEL_LIMITS.DESCRIPTION_MAX} caracteres.`;
  }
  if (message.layout === "container") {
    const total = message.title.length + message.description.length;
    if (total > PANEL_LIMITS.CONTAINER_TEXT_MAX) {
      return `${label}: no layout Container, título + descrição somam no máximo ${PANEL_LIMITS.CONTAINER_TEXT_MAX} caracteres (atual: ${total}).`;
    }
  }
  if (message.color !== null && !HEX_COLOR_PATTERN.test(message.color)) {
    return `${label}: a cor precisa estar no formato #RRGGBB.`;
  }
  if (message.imageUrl !== null) {
    const error = validateImageUrl(message.imageUrl);
    if (error) return `${label}: ${error}`;
  }
  return null;
}

function validateButton(button: RecruitmentButtonConfig, label: string): string | null {
  if (!button || typeof button !== "object") return `${label}: botão ausente.`;
  if (typeof button.label !== "string") return `${label}: texto do botão inválido.`;
  if (button.label.length > PANEL_LIMITS.BUTTON_LABEL_MAX) {
    return `${label}: o texto não pode ultrapassar ${PANEL_LIMITS.BUTTON_LABEL_MAX} caracteres.`;
  }
  if (!button.label.trim() && !button.emoji) {
    return `${label}: o botão precisa de um texto ou de um emoji (os dois vazios deixariam o botão em branco).`;
  }
  if (!VALID_BUTTON_STYLES.includes(button.style)) return `${label}: estilo de botão inválido.`;
  return validateRecruitmentEmoji(button.emoji, label);
}

function validatePlaceholder(placeholder: string, label: string): string | null {
  if (!placeholder.trim()) return `${label}: o texto do dropdown não pode ficar vazio.`;
  if (placeholder.length > SELECT_LIMITS.PLACEHOLDER_MAX) {
    return `${label}: o texto do dropdown não pode ultrapassar ${SELECT_LIMITS.PLACEHOLDER_MAX} caracteres.`;
  }
  return null;
}

function validateOptionShape(
  option: { id: string; label: string; description: string | null; emoji: string | null },
  seen: Set<string>,
  label: string
): string | null {
  if (!RECRUITMENT_OPTION_ID_PATTERN.test(option.id)) {
    return `${label}: o identificador precisa ter de 1 a ${RECRUITMENT_LIMITS.OPTION_ID_MAX} caracteres, com letras minúsculas, números e hífen.`;
  }
  if (seen.has(option.id)) return `${label}: identificador "${option.id}" repetido.`;
  seen.add(option.id);
  if (!option.label.trim()) return `${label}: o nome não pode ficar vazio.`;
  if (option.label.length > SELECT_LIMITS.OPTION_LABEL_MAX) {
    return `${label}: o nome não pode ultrapassar ${SELECT_LIMITS.OPTION_LABEL_MAX} caracteres.`;
  }
  if (option.description && option.description.length > SELECT_LIMITS.OPTION_DESCRIPTION_MAX) {
    return `${label}: a descrição não pode ultrapassar ${SELECT_LIMITS.OPTION_DESCRIPTION_MAX} caracteres.`;
  }
  return validateRecruitmentEmoji(option.emoji, label);
}

function validateStarterRoles(roles: RecruitmentStarterRoleOption[]): string | null {
  if (!Array.isArray(roles)) return "Cargos de iniciante: formato inválido.";
  if (roles.length > RECRUITMENT_LIMITS.MAX_OPTIONS) {
    return `Cargos de iniciante: no máximo ${RECRUITMENT_LIMITS.MAX_OPTIONS} opções (limite do dropdown do Discord).`;
  }
  const seen = new Set<string>();
  for (const role of roles) {
    const label = `Cargo de iniciante "${role.label || role.id}"`;
    const shape = validateOptionShape(role, seen, label);
    if (shape) return shape;
    if (!DISCORD_SNOWFLAKE_PATTERN.test(role.roleId)) {
      return `${label}: selecione o cargo do Discord que será aplicado.`;
    }
  }
  return null;
}

function validateAreas(areas: RecruitmentAreaOption[]): string | null {
  if (!Array.isArray(areas)) return "Áreas: formato inválido.";
  if (areas.length > RECRUITMENT_LIMITS.MAX_OPTIONS) {
    return `Áreas: no máximo ${RECRUITMENT_LIMITS.MAX_OPTIONS} opções (limite do dropdown do Discord).`;
  }
  const seen = new Set<string>();
  for (const area of areas) {
    const label = `Área "${area.label || area.id}"`;
    const shape = validateOptionShape(area, seen, label);
    if (shape) return shape;
    if (!Array.isArray(area.roleIds) || area.roleIds.length === 0) {
      return `${label}: selecione pelo menos um cargo do Discord.`;
    }
    if (area.roleIds.length > RECRUITMENT_LIMITS.MAX_ROLES_PER_AREA) {
      return `${label}: no máximo ${RECRUITMENT_LIMITS.MAX_ROLES_PER_AREA} cargos.`;
    }
    for (const roleId of area.roleIds) {
      if (!DISCORD_SNOWFLAKE_PATTERN.test(roleId)) {
        return `${label}: "${String(roleId)}" não é um id de cargo válido do Discord.`;
      }
    }
    if (!Number.isInteger(area.points) || area.points < 0) {
      return `${label}: os pontos precisam ser um número inteiro maior ou igual a zero.`;
    }
    if (area.points > RECRUITMENT_LIMITS.MAX_POINTS_PER_AREA) {
      return `${label}: no máximo ${RECRUITMENT_LIMITS.MAX_POINTS_PER_AREA} pontos.`;
    }
  }
  return null;
}

function validateRoleList(ids: unknown, label: string, max: number): string | null {
  if (!Array.isArray(ids)) return `${label}: formato inválido.`;
  if (ids.length > max) return `${label}: no máximo ${max} cargos.`;
  for (const id of ids) {
    if (typeof id !== "string" || !DISCORD_SNOWFLAKE_PATTERN.test(id)) {
      return `${label}: "${String(id)}" não é um id de cargo válido do Discord.`;
    }
  }
  return null;
}

function validateShortMessage(value: string, label: string): string | null {
  if (typeof value !== "string" || !value.trim()) return `${label} não pode ficar vazio.`;
  if (value.length > RECRUITMENT_LIMITS.MESSAGE_MAX) {
    return `${label} não pode ultrapassar ${RECRUITMENT_LIMITS.MESSAGE_MAX} caracteres.`;
  }
  return null;
}

/**
 * Valida a FORMA da configuracao inteira, sem checar se os ids existem de
 * fato na guild (isso e feito no servidor, que tem a lista do Discord).
 * Retorna a mensagem de erro em portugues, ou `null` se valido.
 */
export function validateRecruitmentConfig(config: UpdateRecruitmentConfigRequest): string | null {
  if (!config || typeof config !== "object") return "Configuração ausente.";

  const starterError = validateStarterRoles(config.starterRoles);
  if (starterError) return starterError;

  const areaError = validateAreas(config.areas);
  if (areaError) return areaError;

  if (!Number.isInteger(config.minAreas) || config.minAreas < 1) {
    return "O mínimo de áreas precisa ser pelo menos 1.";
  }
  if (!Number.isInteger(config.maxAreas) || config.maxAreas < config.minAreas) {
    return "O máximo de áreas precisa ser maior ou igual ao mínimo.";
  }
  if (config.maxAreas > RECRUITMENT_LIMITS.MAX_OPTIONS) {
    return `O máximo de áreas não pode passar de ${RECRUITMENT_LIMITS.MAX_OPTIONS}.`;
  }
  if (config.areas.length > 0 && config.minAreas > config.areas.length) {
    return `O mínimo de áreas (${config.minAreas}) é maior que a quantidade de áreas cadastradas (${config.areas.length}).`;
  }

  const messages: [RecruitmentMessageConfig, string][] = [
    [config.stepOne.message, "Etapa 1"],
    [config.stepTwo.message, "Etapa 2"],
    [config.stepThree.message, "Etapa 3"],
    [config.outcome.submitted, "Mensagem de ficha enviada"],
    [config.outcome.cancelled, "Mensagem de cancelamento"],
    [config.outcome.expired, "Mensagem de expiração"],
    [config.sheet.message, "Ficha"],
    [config.sheet.queued, "Ficha em processamento"],
    [config.sheet.approved, "Ficha aprovada"],
    [config.sheet.rejected, "Ficha rejeitada"]
  ];
  for (const [message, label] of messages) {
    const error = validateMessage(message, label);
    if (error) return error;
  }

  const buttons: [RecruitmentButtonConfig, string][] = [
    [config.stepOne.cancelButton, "Etapa 1 · botão Cancelar"],
    [config.stepTwo.backButton, "Etapa 2 · botão Voltar"],
    [config.stepTwo.cancelButton, "Etapa 2 · botão Cancelar"],
    [config.stepThree.confirmButton, "Etapa 3 · botão Confirmar"],
    [config.stepThree.restartButton, "Etapa 3 · botão Reiniciar"],
    [config.stepThree.cancelButton, "Etapa 3 · botão Cancelar"],
    [config.sheet.approveButton, "Ficha · botão Confirmar"],
    [config.sheet.rejectButton, "Ficha · botão Rejeitar"],
    [config.sheet.approvedButton, "Ficha · botão aprovado"],
    [config.sheet.rejectedButton, "Ficha · botão rejeitado"]
  ];
  for (const [button, label] of buttons) {
    const error = validateButton(button, label);
    if (error) return error;
  }

  for (const [placeholder, label] of [
    [config.stepOne.select.placeholder, "Etapa 1"],
    [config.stepTwo.select.placeholder, "Etapa 2"]
  ] as const) {
    const error = validatePlaceholder(placeholder, label);
    if (error) return error;
  }

  if (config.sheet.channelId !== null && !DISCORD_SNOWFLAKE_PATTERN.test(config.sheet.channelId)) {
    return "O canal das fichas precisa ser um canal de texto válido do Discord.";
  }
  if (!VALID_AVATAR_PLACEMENTS.includes(config.sheet.avatarPlacement)) {
    return "Posição da foto do recrutado inválida.";
  }
  if (typeof config.sheet.mentionApprovers !== "boolean") {
    return "Marcação dos cargos aprovadores inválida.";
  }

  const approverError = validateRoleList(
    config.approverRoleIds,
    "Cargos que aprovam a ficha",
    RECRUITMENT_LIMITS.MAX_APPROVER_ROLES
  );
  if (approverError) return approverError;

  const granterError = validateRoleList(
    config.pointsGrantRoleIds,
    "Cargos que podem dar pontos",
    RECRUITMENT_LIMITS.MAX_APPROVER_ROLES
  );
  if (granterError) return granterError;

  if (!VALID_POINTS_MODES.includes(config.pointsMode)) {
    return "Modo de pontuação inválido.";
  }
  if (!Number.isInteger(config.minManualPoints) || config.minManualPoints > 0) {
    return "O mínimo do comando manual precisa ser um inteiro menor ou igual a zero.";
  }
  if (!Number.isInteger(config.maxManualPoints) || config.maxManualPoints < 0) {
    return "O máximo do comando manual precisa ser um inteiro maior ou igual a zero.";
  }
  if (
    Math.abs(config.minManualPoints) > RECRUITMENT_LIMITS.MAX_MANUAL_POINTS ||
    config.maxManualPoints > RECRUITMENT_LIMITS.MAX_MANUAL_POINTS
  ) {
    return `Os limites do comando manual não podem passar de ${RECRUITMENT_LIMITS.MAX_MANUAL_POINTS} pontos.`;
  }

  if (
    !Number.isInteger(config.draftTtlMinutes) ||
    config.draftTtlMinutes < RECRUITMENT_LIMITS.DRAFT_TTL_MIN ||
    config.draftTtlMinutes > RECRUITMENT_LIMITS.DRAFT_TTL_MAX
  ) {
    return `O tempo de expiração precisa ficar entre ${RECRUITMENT_LIMITS.DRAFT_TTL_MIN} e ${RECRUITMENT_LIMITS.DRAFT_TTL_MAX} minutos.`;
  }

  for (const [value, label] of [
    [config.rolePendingText, 'O texto de "cargo aguardando"'],
    [config.areasPendingText, 'O texto de "áreas aguardando"'],
    [config.notRecruiterMessage, "A mensagem de quem não é recrutador"],
    [config.notApproverMessage, "A mensagem de quem não pode aprovar"],
    [config.notDraftOwnerMessage, "A mensagem de quem não iniciou o recrutamento"],
    [config.notConfiguredMessage, "A mensagem de fluxo não configurado"]
  ] as const) {
    const error = validateShortMessage(value, label);
    if (error) return error;
  }

  return null;
}

/**
 * Avisos (nao bloqueiam o salvamento) sobre coisas que so ficam ruins em
 * runtime: fluxo incompleto e variaveis de template desconhecidas.
 */
export function collectRecruitmentConfigWarnings(config: UpdateRecruitmentConfigRequest): string[] {
  const warnings: string[] = [];
  if (config.starterRoles.length === 0) {
    warnings.push("Sem cargos de iniciante cadastrados, o comando /recrutar não roda.");
  }
  if (config.areas.length === 0) {
    warnings.push("Sem áreas cadastradas, o comando /recrutar não roda.");
  }
  if (!config.sheet.channelId) {
    warnings.push("Sem canal da ficha, o comando /recrutar não roda.");
  }
  if (config.approverRoleIds.length === 0) {
    warnings.push("Sem cargos aprovadores, ninguém consegue confirmar ou rejeitar uma ficha.");
  }
  if (config.pointsGrantRoleIds.length === 0) {
    warnings.push("Sem cargos autorizados, ninguém consegue usar /pontos-dar.");
  }
  return warnings;
}
