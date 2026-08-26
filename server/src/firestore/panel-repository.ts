import type { PanelButtonConfig, PanelConfig } from "@dragons/shared";
import { getFirestore } from "firebase-admin/firestore";

import type { AppEnv } from "../config/env.js";
import { NotFoundError, ValidationError } from "../errors.js";
import { ensureFirebaseApp } from "./guild-config-repository.js";

/**
 * Leitura e escrita da colecao `panels` (documentos `panels/{guildId}_{id}`),
 * o MESMO formato que
 * `dragonsbot/src/storage/firestore/FirestoreDragonsStore.ts` produz —
 * `createPanel`/`addPanelButton` la e `createPanel`/`updatePanel` aqui
 * precisam continuar escrevendo documentos indistinguiveis, porque o bot
 * ainda vai ler esses mesmos docs na fase 4 (publicacao). Publicacao em si
 * nao e feita por este repositorio.
 */

function sortButtons(panel: PanelConfig): PanelConfig {
  return { ...panel, buttons: [...panel.buttons].sort((a, b) => a.order - b.order) };
}

function panelRef(guildId: string, id: string) {
  return getFirestore().collection("panels").doc(`${guildId}_${id}`);
}

/** Lista os paineis da guild, ordenados por `id`, com botoes ordenados por `order`. */
export async function listPanels(env: AppEnv, guildId: string): Promise<PanelConfig[]> {
  ensureFirebaseApp(env);

  const snapshot = await getFirestore().collection("panels").where("guildId", "==", guildId).get();
  return snapshot.docs
    .map((doc) => sortButtons(doc.data() as PanelConfig))
    .sort((a, b) => a.id.localeCompare(b.id));
}

/** Busca um painel especifico da guild. Retorna `null` se nao existir. */
export async function getPanel(
  env: AppEnv,
  guildId: string,
  id: string
): Promise<PanelConfig | null> {
  ensureFirebaseApp(env);

  const snapshot = await panelRef(guildId, id).get();

  if (!snapshot.exists) return null;

  const panel = snapshot.data() as PanelConfig;
  // Defesa extra: um doc-id malformado nao deveria vazar dados de outra guild.
  if (panel.guildId !== guildId) return null;

  return sortButtons(panel);
}

/**
 * Cria um painel vazio (sem imagem, sem botoes) — mesmo formato de
 * documento que `FirestoreDragonsStore.createPanel` no bot.
 */
export async function createPanel(
  env: AppEnv,
  guildId: string,
  id: string,
  title: string,
  description: string
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
    title,
    description,
    imageUrl: null,
    buttons: [],
    createdAt: now,
    updatedAt: now
  };
  await ref.set(document);
  return document;
}

export interface PanelUpdate {
  title?: string;
  description?: string;
  imageUrl?: string | null;
  buttons?: PanelButtonConfig[];
}

/** Atualiza campos parciais de um painel existente. Sempre atualiza `updatedAt`; preserva `createdAt` (nunca reescrito). */
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
  if (patch.title !== undefined) update.title = patch.title;
  if (patch.description !== undefined) update.description = patch.description;
  if (patch.imageUrl !== undefined) update.imageUrl = patch.imageUrl;
  if (patch.buttons !== undefined) update.buttons = patch.buttons;

  await ref.update(update);
  const updated = await ref.get();
  return sortButtons(updated.data() as PanelConfig);
}

/** Remove um painel. */
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
