/**
 * ESPELHO de `dragonsbot/src/domain/types.ts` (repositorio do bot, em
 * `~/dev/dragonsbot`).
 *
 * Descreve `recruitmentConfigs/{guildId}` — a configuracao do fluxo de
 * recrutamento em 3 etapas. A escrita e EXCLUSIVA da dragons-platform; o bot
 * so le. Qualquer alteracao de forma (campos, tipos, valores possiveis) DEVE
 * ser feita nos DOIS repositorios ao mesmo tempo, senao o bot passa a ler
 * dados incompativeis sem nenhum erro de compilacao avisando.
 *
 * Spec: `docs/specs/2026-08-29-recrutamento-multi-etapas.md`.
 */

import type { PanelButtonStyle, PanelLayout } from "./panel.js";

/**
 * Uma mensagem do fluxo, no mesmo modelo das mensagens de painel:
 * `embed` (classico) ou `container` (Components V2 — emoji customizado
 * funciona no titulo, imagem vira banner no topo).
 *
 * `title` e `description` sao templates: `{chave}` e trocado pelos valores
 * do recrutamento (ver RECRUITMENT_TEMPLATE_VARIABLES).
 */
export interface RecruitmentMessageConfig {
  layout: PanelLayout;
  title: string;
  description: string;
  imageUrl: string | null;
  color: string | null;
}

/**
 * Um botao do fluxo. `label` vazio e valido desde que exista `emoji` (os
 * botoes da ficha sao so um icone); os dois vazios e erro de validacao.
 * `emoji` customizado precisa ser `<:nome:id>` / `<a:nome:id>` — o Discord
 * NAO resolve `:shortcode:`, que apareceria como texto cru na mensagem.
 */
export interface RecruitmentButtonConfig {
  label: string;
  emoji: string | null;
  style: PanelButtonStyle;
}

/** Um dropdown do fluxo. As opcoes vem de `starterRoles` / `areas`. */
export interface RecruitmentSelectConfig {
  placeholder: string;
}

/** Uma opcao do dropdown da etapa 1 — cargo de iniciante. */
export interface RecruitmentStarterRoleOption {
  /** Slug estavel; e o `value` da opcao no Discord e a chave do snapshot. */
  id: string;
  label: string;
  description: string | null;
  emoji: string | null;
  /** Cargo aplicado ao recrutado quando a ficha e aprovada. */
  roleId: string;
  order: number;
}

/** Uma opcao do dropdown da etapa 2 — area, com 1..n cargos e pontuacao. */
export interface RecruitmentAreaOption {
  id: string;
  label: string;
  description: string | null;
  emoji: string | null;
  /** Cargos aplicados ao recrutado quando a ficha e aprovada. */
  roleIds: string[];
  /** Pontos creditados ao RECRUTADOR por esta area. */
  points: number;
  order: number;
}

export interface RecruitmentStepOneConfig {
  message: RecruitmentMessageConfig;
  select: RecruitmentSelectConfig;
  cancelButton: RecruitmentButtonConfig;
}

export interface RecruitmentStepTwoConfig {
  message: RecruitmentMessageConfig;
  select: RecruitmentSelectConfig;
  backButton: RecruitmentButtonConfig;
  cancelButton: RecruitmentButtonConfig;
}

export interface RecruitmentStepThreeConfig {
  message: RecruitmentMessageConfig;
  confirmButton: RecruitmentButtonConfig;
  restartButton: RecruitmentButtonConfig;
  cancelButton: RecruitmentButtonConfig;
}

/** Estados finais do wizard — mensagem sem componentes. */
export interface RecruitmentOutcomeConfig {
  submitted: RecruitmentMessageConfig;
  cancelled: RecruitmentMessageConfig;
  expired: RecruitmentMessageConfig;
}

/**
 * Onde entra a foto do recrutado na ficha. `thumbnail` = canto direito
 * (accessory de Section no container, setThumbnail no embed). `image` =
 * banner (MediaGallery no container, setImage no embed).
 */
export type RecruitmentAvatarPlacement = "thumbnail" | "image" | "none";

export interface RecruitmentSheetConfig {
  /** Canal onde a ficha e postada. `null` = fluxo ainda nao configurado. */
  channelId: string | null;
  message: RecruitmentMessageConfig;
  approveButton: RecruitmentButtonConfig;
  rejectButton: RecruitmentButtonConfig;
  /** Estado enquanto o job de aprovacao nao rodou. */
  queued: RecruitmentMessageConfig;
  approved: RecruitmentMessageConfig;
  rejected: RecruitmentMessageConfig;
  /** Labels dos botoes ja travados nos estados acima. */
  approvedButton: RecruitmentButtonConfig;
  rejectedButton: RecruitmentButtonConfig;
  avatarPlacement: RecruitmentAvatarPlacement;
  /** Marca os cargos aprovadores no `content` ao postar a ficha. */
  mentionApprovers: boolean;
}

/**
 * Como os pontos das areas escolhidas viram os pontos do recrutamento:
 * `sum` soma todas (default — Familia 6 + Recrutamento 8 = 14), `highest`
 * usa so a maior.
 */
export type RecruitmentPointsMode = "sum" | "highest";

export interface RecruitmentFlowConfig {
  guildId: string;
  starterRoles: RecruitmentStarterRoleOption[];
  areas: RecruitmentAreaOption[];
  minAreas: number;
  maxAreas: number;
  stepOne: RecruitmentStepOneConfig;
  stepTwo: RecruitmentStepTwoConfig;
  stepThree: RecruitmentStepThreeConfig;
  outcome: RecruitmentOutcomeConfig;
  sheet: RecruitmentSheetConfig;
  /** Cargos que podem Confirmar/Rejeitar a ficha (gerencia/lideres). */
  approverRoleIds: string[];
  /** Cargos que podem usar `/pontos-dar`. */
  pointsGrantRoleIds: string[];
  pointsMode: RecruitmentPointsMode;
  minManualPoints: number;
  maxManualPoints: number;
  /** Minutos ate um rascunho de wizard abandonado expirar. */
  draftTtlMinutes: number;
  /** Textos que substituem `{role}` / `{areas}` antes da selecao. */
  rolePendingText: string;
  areasPendingText: string;
  /** Respostas efemeras de bloqueio. */
  notRecruiterMessage: string;
  notApproverMessage: string;
  notDraftOwnerMessage: string;
  notConfiguredMessage: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Variaveis aceitas em `title`/`description` de qualquer
 * `RecruitmentMessageConfig`. O que nao casar fica intacto na mensagem
 * (ver `renderTemplate` no bot), entao variavel desconhecida e aviso, nao erro.
 */
export const RECRUITMENT_TEMPLATE_VARIABLES = [
  { key: "step", help: "Numero da etapa atual" },
  { key: "total", help: "Total de etapas (3)" },
  { key: "recruited", help: "Mencao do recrutado" },
  { key: "recruitedId", help: "Id do recrutado (copiavel)" },
  { key: "recruitedTag", help: "Usuario#0000 do recrutado" },
  { key: "recruiter", help: "Mencao do recrutador" },
  { key: "recruiterId", help: "Id do recrutador" },
  { key: "recruiterTag", help: "Usuario#0000 do recrutador" },
  { key: "role", help: "Cargo de iniciante escolhido" },
  { key: "areas", help: "Areas escolhidas, separadas por virgula" },
  { key: "min", help: "Minimo de areas" },
  { key: "max", help: "Maximo de areas" },
  { key: "points", help: "Pontos que o recrutador recebe" },
  { key: "createdAt", help: "Data de criacao da conta do recrutado" },
  { key: "approver", help: "Quem confirmou/rejeitou a ficha" }
] as const;

/**
 * Sementes usadas pelo painel no botao "preencher com o padrao". Nao sao o
 * default do documento (que nasce com as listas vazias, porque cargo do
 * Discord nao da para adivinhar) — sao so o ponto de partida da UI.
 */
export const RECRUITMENT_STARTER_ROLE_SEED = [
  "Mystic",
  "Revenge",
  "Swag",
  "Lotus",
  "Hope",
  "Delusions"
] as const;

export const RECRUITMENT_AREA_SEED = [
  { label: "Familia", points: 6 },
  { label: "Recrutamento", points: 8 },
  { label: "Passtime", points: 0 },
  { label: "Suporte", points: 0 }
] as const;

function message(
  title: string,
  description: string,
  color: string | null = "#5865F2"
): RecruitmentMessageConfig {
  return { layout: "container", title, description, imageUrl: null, color };
}

function button(
  label: string,
  style: PanelButtonStyle,
  emoji: string | null = null
): RecruitmentButtonConfig {
  return { label, emoji, style };
}

/** Linhas de campo comuns as tres etapas do wizard. */
const WIZARD_FIELDS = [
  "**Recrutado:** {recruited}",
  "**Cargo:** `{role}`",
  "**Areas:** `{areas}`"
].join("\n");

export const DEFAULT_RECRUITMENT_STEP_ONE: RecruitmentStepOneConfig = {
  message: message(
    "Recrutamento - etapa {step}/{total}",
    `${WIZARD_FIELDS}\n\n*Selecione o cargo de iniciante*`
  ),
  select: { placeholder: "Selecione o cargo de iniciante" },
  cancelButton: button("Cancelar", "Danger")
};

export const DEFAULT_RECRUITMENT_STEP_TWO: RecruitmentStepTwoConfig = {
  message: message(
    "Recrutamento - etapa {step}/{total}",
    `${WIZARD_FIELDS}\n\n*Selecione ate {max} areas*`
  ),
  select: { placeholder: "Selecione as areas" },
  backButton: button("Voltar", "Secondary"),
  cancelButton: button("Cancelar", "Danger")
};

export const DEFAULT_RECRUITMENT_STEP_THREE: RecruitmentStepThreeConfig = {
  message: message(
    "Confirmar recrutamento",
    `${WIZARD_FIELDS}\n\n*Confirme para aplicar os cargos e gerar a ficha*`
  ),
  confirmButton: button("Confirmar", "Success"),
  restartButton: button("Reiniciar", "Secondary"),
  cancelButton: button("Cancelar", "Danger")
};

export const DEFAULT_RECRUITMENT_OUTCOME: RecruitmentOutcomeConfig = {
  submitted: message(
    "Recrutamento enviado",
    `${WIZARD_FIELDS}\n\nA ficha foi enviada para aprovacao da gerencia.`,
    "#F08C00"
  ),
  cancelled: message(
    "Recrutamento cancelado",
    "O recrutamento de {recruited} foi cancelado por {recruiter}.",
    "#868E96"
  ),
  expired: message(
    "Recrutamento expirado",
    "O recrutamento de {recruited} expirou sem ser concluido. Rode `/recrutar` de novo.",
    "#868E96"
  )
};

const SHEET_FIELDS = [
  "**Recrutador:** {recruiter}",
  "**Recrutado:** {recruited} (`{recruitedId}`)",
  "**Cargo:** `{role}`",
  "**Areas:** `{areas}`",
  "**Conta criada:** {createdAt}"
].join("\n");

export const DEFAULT_RECRUITMENT_SHEET: RecruitmentSheetConfig = {
  channelId: null,
  message: message("Ficha de recrutamento", SHEET_FIELDS),
  approveButton: button("Confirmar", "Success"),
  rejectButton: button("Rejeitar", "Danger"),
  queued: message(
    "Ficha em processamento",
    `${SHEET_FIELDS}\n\nConfirmada por {approver}. Aplicando os cargos...`,
    "#F08C00"
  ),
  approved: message(
    "Recrutamento aprovado",
    `${SHEET_FIELDS}\n\nAprovado por {approver}. O recrutador recebeu **{points}** pontos.`,
    "#2F9E44"
  ),
  rejected: message(
    "Recrutamento rejeitado",
    `${SHEET_FIELDS}\n\nRejeitado por {approver}.`,
    "#C92A2A"
  ),
  approvedButton: button("Aprovado", "Success"),
  rejectedButton: button("Rejeitado", "Danger"),
  avatarPlacement: "thumbnail",
  mentionApprovers: true
};

/**
 * Documento default. `starterRoles`/`areas` vazios e `sheet.channelId` nulo
 * significam "ainda nao configurado no painel" — o bot responde
 * `notConfiguredMessage` em vez de tentar rodar o fluxo.
 */
export const DEFAULT_RECRUITMENT_FLOW_CONFIG: Omit<
  RecruitmentFlowConfig,
  "guildId" | "createdAt" | "updatedAt"
> = {
  starterRoles: [],
  areas: [],
  minAreas: 1,
  maxAreas: 2,
  stepOne: DEFAULT_RECRUITMENT_STEP_ONE,
  stepTwo: DEFAULT_RECRUITMENT_STEP_TWO,
  stepThree: DEFAULT_RECRUITMENT_STEP_THREE,
  outcome: DEFAULT_RECRUITMENT_OUTCOME,
  sheet: DEFAULT_RECRUITMENT_SHEET,
  approverRoleIds: [],
  pointsGrantRoleIds: [],
  pointsMode: "sum",
  minManualPoints: -100,
  maxManualPoints: 100,
  draftTtlMinutes: 15,
  rolePendingText: "aguardando selecao",
  areasPendingText: "aguardando",
  notRecruiterMessage: "Voce nao possui o cargo de recrutamento.",
  notApproverMessage: "Voce nao tem permissao para essa acao.",
  notDraftOwnerMessage: "Apenas quem iniciou este recrutamento pode usar estes botoes.",
  notConfiguredMessage:
    "O fluxo de recrutamento ainda nao foi configurado no painel (cargos de iniciante, areas e canal da ficha)."
};

/** Soma/maior valor dos pontos das areas escolhidas, conforme `pointsMode`. */
export function calculateRecruitmentPoints(
  areas: readonly RecruitmentAreaOption[],
  mode: RecruitmentPointsMode
): number {
  if (areas.length === 0) return 0;
  const points = areas.map((area) => area.points);
  return mode === "highest"
    ? Math.max(...points)
    : points.reduce((total, value) => total + value, 0);
}
