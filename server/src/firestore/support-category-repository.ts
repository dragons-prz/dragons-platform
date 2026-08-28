import type { SupportCategoryCloseAction, SupportCategoryConfig } from "@dragons/shared";
import { getFirestore } from "firebase-admin/firestore";

import type { AppEnv } from "../config/env.js";
import { NotFoundError, ValidationError } from "../errors.js";
import { ensureFirebaseApp } from "./guild-config-repository.js";

/**
 * Leitura e escrita da colecao `supportCategories` (documentos
 * `supportCategories/{guildId}_{id}`). O bot le esses documentos como
 * `SupportCategoryConfig` — este repositorio e a UNICA fonte de escrita
 * deles. Os `tickets`/`openTicketKeys` sao o oposto (so o bot escreve),
 * entao nao aparecem aqui.
 */

function categoryRef(guildId: string, id: string) {
  return getFirestore().collection("supportCategories").doc(`${guildId}_${id}`);
}

function normalize(data: Partial<SupportCategoryConfig>, guildId: string): SupportCategoryConfig {
  return {
    id: data.id ?? "",
    guildId,
    name: data.name ?? "",
    parentChannelId: data.parentChannelId ?? "",
    supportRoleIds: data.supportRoleIds ?? [],
    viewerRoleIds: data.viewerRoleIds ?? [],
    threadNameTemplate: data.threadNameTemplate ?? "{user}",
    openMessage: data.openMessage ?? "",
    claimMessage: data.claimMessage ?? "",
    closeMessage: data.closeMessage ?? "",
    closeAction: (data.closeAction as SupportCategoryCloseAction) ?? "archive-remove",
    createdAt: data.createdAt ?? new Date().toISOString(),
    updatedAt: data.updatedAt ?? new Date().toISOString()
  };
}

export async function listSupportCategories(
  env: AppEnv,
  guildId: string
): Promise<SupportCategoryConfig[]> {
  ensureFirebaseApp(env);
  const snapshot = await getFirestore()
    .collection("supportCategories")
    .where("guildId", "==", guildId)
    .get();
  return snapshot.docs
    .map((doc) => normalize(doc.data() as Partial<SupportCategoryConfig>, guildId))
    .sort((a, b) => a.id.localeCompare(b.id));
}

export async function getSupportCategory(
  env: AppEnv,
  guildId: string,
  id: string
): Promise<SupportCategoryConfig | null> {
  ensureFirebaseApp(env);
  const snapshot = await categoryRef(guildId, id).get();
  if (!snapshot.exists) return null;
  const data = snapshot.data() as Partial<SupportCategoryConfig>;
  if (data.guildId !== guildId) return null;
  return normalize(data, guildId);
}

export interface CreateSupportCategoryInput {
  id: string;
  name: string;
  parentChannelId: string;
  supportRoleIds: string[];
  viewerRoleIds: string[];
  threadNameTemplate: string;
  openMessage: string;
  claimMessage: string;
  closeMessage: string;
  closeAction: SupportCategoryCloseAction;
}

export async function createSupportCategory(
  env: AppEnv,
  guildId: string,
  input: CreateSupportCategoryInput
): Promise<SupportCategoryConfig> {
  ensureFirebaseApp(env);
  const ref = categoryRef(guildId, input.id);
  const snapshot = await ref.get();
  if (snapshot.exists) {
    throw new ValidationError(
      `Já existe uma categoria de suporte com o id "${input.id}" neste servidor.`
    );
  }

  const now = new Date().toISOString();
  const document: SupportCategoryConfig = {
    id: input.id,
    guildId,
    name: input.name,
    parentChannelId: input.parentChannelId,
    supportRoleIds: input.supportRoleIds,
    viewerRoleIds: input.viewerRoleIds,
    threadNameTemplate: input.threadNameTemplate,
    openMessage: input.openMessage,
    claimMessage: input.claimMessage,
    closeMessage: input.closeMessage,
    closeAction: input.closeAction,
    createdAt: now,
    updatedAt: now
  };
  await ref.set(document);
  return document;
}

export interface SupportCategoryUpdate {
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

const WRITABLE_KEYS = [
  "name",
  "parentChannelId",
  "supportRoleIds",
  "viewerRoleIds",
  "threadNameTemplate",
  "openMessage",
  "claimMessage",
  "closeMessage",
  "closeAction"
] as const;

export async function updateSupportCategory(
  env: AppEnv,
  guildId: string,
  id: string,
  patch: SupportCategoryUpdate
): Promise<SupportCategoryConfig> {
  ensureFirebaseApp(env);
  const ref = categoryRef(guildId, id);
  const snapshot = await ref.get();
  const current = snapshot.exists ? (snapshot.data() as Partial<SupportCategoryConfig>) : null;
  if (!current || current.guildId !== guildId) {
    throw new NotFoundError(`Categoria de suporte "${id}" não encontrada.`);
  }

  const update: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  for (const key of WRITABLE_KEYS) {
    if (patch[key] !== undefined) {
      update[key] = patch[key];
    }
  }

  await ref.update(update);
  const fresh = await ref.get();
  return normalize(fresh.data() as Partial<SupportCategoryConfig>, guildId);
}

export async function deleteSupportCategory(
  env: AppEnv,
  guildId: string,
  id: string
): Promise<void> {
  ensureFirebaseApp(env);
  const ref = categoryRef(guildId, id);
  const snapshot = await ref.get();
  const current = snapshot.exists ? (snapshot.data() as Partial<SupportCategoryConfig>) : null;
  if (!current || current.guildId !== guildId) {
    throw new NotFoundError(`Categoria de suporte "${id}" não encontrada.`);
  }
  await ref.delete();
}
