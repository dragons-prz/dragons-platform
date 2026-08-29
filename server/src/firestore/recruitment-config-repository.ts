import type {
  RecruitmentAreaOption,
  RecruitmentButtonConfig,
  RecruitmentFlowConfig,
  RecruitmentMessageConfig,
  RecruitmentStarterRoleOption,
  UpdateRecruitmentConfigRequest
} from "@dragons/shared";
import { DEFAULT_RECRUITMENT_FLOW_CONFIG } from "@dragons/shared";
import { getFirestore } from "firebase-admin/firestore";

import type { AppEnv } from "../config/env.js";
import { ensureFirebaseApp } from "./guild-config-repository.js";

/**
 * Leitura e escrita de `recruitmentConfigs/{guildId}` — a configuracao do
 * fluxo de recrutamento em 3 etapas. O bot le esse documento como
 * `RecruitmentFlowConfig`; este repositorio e a UNICA fonte de escrita dele
 * (`recruitmentDrafts` e `recruitments` sao o oposto: so o bot escreve).
 *
 * `normalize` aplica os mesmos defaults que o bot aplica do outro lado, para
 * documento ausente ou parcial nunca quebrar nenhum dos dois.
 */

function configRef(guildId: string) {
  return getFirestore().collection("recruitmentConfigs").doc(guildId);
}

function normalizeMessage(
  data: Partial<RecruitmentMessageConfig> | undefined,
  fallback: RecruitmentMessageConfig
): RecruitmentMessageConfig {
  return {
    layout: data?.layout ?? fallback.layout,
    title: data?.title ?? fallback.title,
    description: data?.description ?? fallback.description,
    imageUrl: data?.imageUrl ?? fallback.imageUrl,
    color: data?.color ?? fallback.color
  };
}

function normalizeButton(
  data: Partial<RecruitmentButtonConfig> | undefined,
  fallback: RecruitmentButtonConfig
): RecruitmentButtonConfig {
  return {
    label: data?.label ?? fallback.label,
    emoji: data?.emoji ?? fallback.emoji,
    style: data?.style ?? fallback.style
  };
}

function normalizeStarterRoles(data: unknown): RecruitmentStarterRoleOption[] {
  if (!Array.isArray(data)) return [];
  return data
    .map((raw, index) => {
      const option = raw as Partial<RecruitmentStarterRoleOption>;
      return {
        id: option.id ?? "",
        label: option.label ?? "",
        description: option.description ?? null,
        emoji: option.emoji ?? null,
        roleId: option.roleId ?? "",
        order: typeof option.order === "number" ? option.order : index
      };
    })
    .sort((a, b) => a.order - b.order)
    .map((option, index) => ({ ...option, order: index }));
}

function normalizeAreas(data: unknown): RecruitmentAreaOption[] {
  if (!Array.isArray(data)) return [];
  return data
    .map((raw, index) => {
      const option = raw as Partial<RecruitmentAreaOption>;
      return {
        id: option.id ?? "",
        label: option.label ?? "",
        description: option.description ?? null,
        emoji: option.emoji ?? null,
        roleIds: Array.isArray(option.roleIds) ? option.roleIds : [],
        points: typeof option.points === "number" ? option.points : 0,
        order: typeof option.order === "number" ? option.order : index
      };
    })
    .sort((a, b) => a.order - b.order)
    .map((option, index) => ({ ...option, order: index }));
}

function normalize(
  data: Partial<RecruitmentFlowConfig> | null,
  guildId: string
): RecruitmentFlowConfig {
  const defaults = DEFAULT_RECRUITMENT_FLOW_CONFIG;
  const now = new Date().toISOString();
  return {
    guildId,
    starterRoles: normalizeStarterRoles(data?.starterRoles),
    areas: normalizeAreas(data?.areas),
    minAreas: data?.minAreas ?? defaults.minAreas,
    maxAreas: data?.maxAreas ?? defaults.maxAreas,
    stepOne: {
      message: normalizeMessage(data?.stepOne?.message, defaults.stepOne.message),
      select: {
        placeholder: data?.stepOne?.select?.placeholder ?? defaults.stepOne.select.placeholder
      },
      cancelButton: normalizeButton(data?.stepOne?.cancelButton, defaults.stepOne.cancelButton)
    },
    stepTwo: {
      message: normalizeMessage(data?.stepTwo?.message, defaults.stepTwo.message),
      select: {
        placeholder: data?.stepTwo?.select?.placeholder ?? defaults.stepTwo.select.placeholder
      },
      backButton: normalizeButton(data?.stepTwo?.backButton, defaults.stepTwo.backButton),
      cancelButton: normalizeButton(data?.stepTwo?.cancelButton, defaults.stepTwo.cancelButton)
    },
    stepThree: {
      message: normalizeMessage(data?.stepThree?.message, defaults.stepThree.message),
      confirmButton: normalizeButton(
        data?.stepThree?.confirmButton,
        defaults.stepThree.confirmButton
      ),
      restartButton: normalizeButton(
        data?.stepThree?.restartButton,
        defaults.stepThree.restartButton
      ),
      cancelButton: normalizeButton(data?.stepThree?.cancelButton, defaults.stepThree.cancelButton)
    },
    outcome: {
      submitted: normalizeMessage(data?.outcome?.submitted, defaults.outcome.submitted),
      cancelled: normalizeMessage(data?.outcome?.cancelled, defaults.outcome.cancelled),
      expired: normalizeMessage(data?.outcome?.expired, defaults.outcome.expired)
    },
    sheet: {
      channelId: data?.sheet?.channelId ?? defaults.sheet.channelId,
      message: normalizeMessage(data?.sheet?.message, defaults.sheet.message),
      approveButton: normalizeButton(data?.sheet?.approveButton, defaults.sheet.approveButton),
      rejectButton: normalizeButton(data?.sheet?.rejectButton, defaults.sheet.rejectButton),
      queued: normalizeMessage(data?.sheet?.queued, defaults.sheet.queued),
      approved: normalizeMessage(data?.sheet?.approved, defaults.sheet.approved),
      rejected: normalizeMessage(data?.sheet?.rejected, defaults.sheet.rejected),
      approvedButton: normalizeButton(data?.sheet?.approvedButton, defaults.sheet.approvedButton),
      rejectedButton: normalizeButton(data?.sheet?.rejectedButton, defaults.sheet.rejectedButton),
      avatarPlacement: data?.sheet?.avatarPlacement ?? defaults.sheet.avatarPlacement,
      mentionApprovers: data?.sheet?.mentionApprovers ?? defaults.sheet.mentionApprovers
    },
    approverRoleIds: data?.approverRoleIds ?? [],
    pointsGrantRoleIds: data?.pointsGrantRoleIds ?? [],
    pointsMode: data?.pointsMode ?? defaults.pointsMode,
    minManualPoints: data?.minManualPoints ?? defaults.minManualPoints,
    maxManualPoints: data?.maxManualPoints ?? defaults.maxManualPoints,
    draftTtlMinutes: data?.draftTtlMinutes ?? defaults.draftTtlMinutes,
    rolePendingText: data?.rolePendingText ?? defaults.rolePendingText,
    areasPendingText: data?.areasPendingText ?? defaults.areasPendingText,
    notRecruiterMessage: data?.notRecruiterMessage ?? defaults.notRecruiterMessage,
    notApproverMessage: data?.notApproverMessage ?? defaults.notApproverMessage,
    notDraftOwnerMessage: data?.notDraftOwnerMessage ?? defaults.notDraftOwnerMessage,
    notConfiguredMessage: data?.notConfiguredMessage ?? defaults.notConfiguredMessage,
    createdAt: data?.createdAt ?? now,
    updatedAt: data?.updatedAt ?? now
  };
}

/** Nunca 404: documento ausente devolve o default (o painel edita e cria no primeiro PUT). */
export async function getRecruitmentConfig(
  env: AppEnv,
  guildId: string
): Promise<RecruitmentFlowConfig> {
  ensureFirebaseApp(env);
  const snapshot = await configRef(guildId).get();
  const data = snapshot.exists ? (snapshot.data() as Partial<RecruitmentFlowConfig>) : null;
  return normalize(data, guildId);
}

export async function putRecruitmentConfig(
  env: AppEnv,
  guildId: string,
  input: UpdateRecruitmentConfigRequest
): Promise<RecruitmentFlowConfig> {
  ensureFirebaseApp(env);
  const ref = configRef(guildId);
  const snapshot = await ref.get();
  const existing = snapshot.exists ? (snapshot.data() as Partial<RecruitmentFlowConfig>) : null;
  const now = new Date().toISOString();

  const document: RecruitmentFlowConfig = {
    ...normalize({ ...input, guildId }, guildId),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now
  };

  await ref.set(document);
  return document;
}
