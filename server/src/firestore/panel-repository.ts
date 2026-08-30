import type {
  PanelBlock,
  PanelButtonConfig,
  PanelConfig,
  PanelSelectOption
} from "@dragons/shared";
import { panelBlocksFromLegacy, resolveButtonAction } from "@dragons/shared";
import { getFirestore } from "firebase-admin/firestore";

import type { AppEnv } from "../config/env.js";
import { NotFoundError, ValidationError } from "../errors.js";
import { ensureFirebaseApp } from "./guild-config-repository.js";

/**
 * Leitura e escrita da colecao `panels` (documentos `panels/{guildId}_{id}`),
 * o MESMO formato que
 * `dragonsbot/src/storage/firestore/FirestoreDragonsStore.ts` produz.
 *
 * O painel e uma lista de `blocks` (Components V2). Documentos antigos (sem
 * `blocks`, no formato title/description/buttons/... no topo) sao migrados
 * na leitura por `panelBlocksFromLegacy` — sem script. A escrita nova grava
 * so `blocks` + `color`; nao apaga nem reescreve os campos legados.
 */

const EMPTY_REPLY = {
  type: "reply",
  response: "",
  responseImageUrl: null,
  responseColor: null
} as const;

function normalizeButton(button: PanelButtonConfig): PanelButtonConfig {
  return {
    ...button,
    responseImageUrl: button.responseImageUrl ?? null,
    responseColor: button.responseColor ?? null,
    action: resolveButtonAction(button)
  };
}

function normalizeOption(option: PanelSelectOption): PanelSelectOption {
  return {
    id: option.id,
    label: option.label,
    description: option.description ?? null,
    emoji: option.emoji ?? null,
    action: option.action ?? EMPTY_REPLY,
    order: option.order
  };
}

function normalizeBlock(block: PanelBlock): PanelBlock {
  if (block.type === "buttons") {
    return {
      type: "buttons",
      buttons: [...block.buttons].sort((a, b) => a.order - b.order).map(normalizeButton)
    };
  }
  if (block.type === "select") {
    return {
      type: "select",
      placeholder: block.placeholder,
      options: [...block.options].sort((a, b) => a.order - b.order).map(normalizeOption)
    };
  }
  return block;
}

function normalizePanel(raw: PanelConfig): PanelConfig {
  const source: PanelBlock[] =
    Array.isArray(raw.blocks) && raw.blocks.length > 0 ? raw.blocks : panelBlocksFromLegacy(raw);
  return {
    id: raw.id,
    guildId: raw.guildId,
    color: raw.color ?? null,
    blocks: source.map(normalizeBlock),
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    publishedChannelId: raw.publishedChannelId ?? null,
    publishedMessageId: raw.publishedMessageId ?? null
  };
}

function panelRef(guildId: string, id: string) {
  return getFirestore().collection("panels").doc(`${guildId}_${id}`);
}

export async function listPanels(env: AppEnv, guildId: string): Promise<PanelConfig[]> {
  ensureFirebaseApp(env);
  const snapshot = await getFirestore().collection("panels").where("guildId", "==", guildId).get();
  return snapshot.docs
    .map((doc) => normalizePanel(doc.data() as PanelConfig))
    .sort((a, b) => a.id.localeCompare(b.id));
}

export async function getPanel(
  env: AppEnv,
  guildId: string,
  id: string
): Promise<PanelConfig | null> {
  ensureFirebaseApp(env);
  const snapshot = await panelRef(guildId, id).get();
  if (!snapshot.exists) return null;
  const panel = snapshot.data() as PanelConfig;
  if (panel.guildId !== guildId) return null;
  return normalizePanel(panel);
}

/**
 * Cria um painel novo com um unico bloco de texto (`## {title}`) — mesmo
 * formato de documento que `FirestoreDragonsStore.createPanel` no bot.
 */
export async function createPanel(
  env: AppEnv,
  guildId: string,
  id: string,
  title: string
): Promise<PanelConfig> {
  ensureFirebaseApp(env);

  const ref = panelRef(guildId, id);
  const snapshot = await ref.get();
  if (snapshot.exists) {
    throw new ValidationError(`Já existe um painel com o id "${id}" neste servidor.`);
  }

  const now = new Date().toISOString();
  const document: PanelConfig = {
    id,
    guildId,
    color: null,
    blocks: [{ type: "text", content: `## ${title}` }],
    createdAt: now,
    updatedAt: now,
    publishedChannelId: null,
    publishedMessageId: null
  };
  await ref.set(document);
  return document;
}

export interface PanelUpdate {
  color?: string | null;
  blocks?: PanelBlock[];
}

export async function updatePanel(
  env: AppEnv,
  guildId: string,
  id: string,
  patch: PanelUpdate
): Promise<PanelConfig> {
  ensureFirebaseApp(env);

  const ref = panelRef(guildId, id);
  const snapshot = await ref.get();
  const current = snapshot.exists ? (snapshot.data() as PanelConfig) : null;
  if (!current || current.guildId !== guildId) {
    throw new NotFoundError(`Painel "${id}" não encontrado.`);
  }

  const update: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (patch.color !== undefined) update.color = patch.color;
  if (patch.blocks !== undefined) update.blocks = patch.blocks;

  await ref.update(update);
  const updated = await ref.get();
  return normalizePanel(updated.data() as PanelConfig);
}

export async function deletePanel(env: AppEnv, guildId: string, id: string): Promise<void> {
  ensureFirebaseApp(env);
  const ref = panelRef(guildId, id);
  const snapshot = await ref.get();
  const current = snapshot.exists ? (snapshot.data() as PanelConfig) : null;
  if (!current || current.guildId !== guildId) {
    throw new NotFoundError(`Painel "${id}" não encontrado.`);
  }
  await ref.delete();
}
