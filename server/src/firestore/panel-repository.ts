import type { PanelConfig } from "@dragons/shared";
import { getFirestore } from "firebase-admin/firestore";

import type { AppEnv } from "../config/env.js";
import { ensureFirebaseApp } from "./guild-config-repository.js";

/**
 * Leitura da colecao `panels` (documentos `panels/{guildId}_{id}`), o
 * mesmo formato que `dragonsbot/src/storage/firestore/FirestoreDragonsStore.ts`
 * escreve. Esta fase e somente leitura — criacao/edicao/publicacao ficam
 * para a fase 3.
 */

function sortButtons(panel: PanelConfig): PanelConfig {
  return { ...panel, buttons: [...panel.buttons].sort((a, b) => a.order - b.order) };
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

  const snapshot = await getFirestore().collection("panels").doc(`${guildId}_${id}`).get();

  if (!snapshot.exists) return null;

  const panel = snapshot.data() as PanelConfig;
  // Defesa extra: um doc-id malformado nao deveria vazar dados de outra guild.
  if (panel.guildId !== guildId) return null;

  return sortButtons(panel);
}
