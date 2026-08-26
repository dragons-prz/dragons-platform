import type { GuildConfig } from "@dragons/shared";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import type { ServiceAccount } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "node:fs";

import type { AppEnv } from "../config/env.js";

let firestoreInitialized = false;

function loadServiceAccount(path: string): ServiceAccount {
  return JSON.parse(readFileSync(path, "utf8")) as ServiceAccount;
}

export function ensureFirebaseApp(env: AppEnv): void {
  if (firestoreInitialized || getApps().length) {
    firestoreInitialized = true;
    return;
  }

  initializeApp({
    credential: cert(loadServiceAccount(env.firebaseServiceAccountPath))
  });
  firestoreInitialized = true;
}

/**
 * Busca o documento `guildConfigs/{guildId}` completo no Firestore.
 *
 * Diferente do bot, o painel NAO cria o documento se ele nao existir —
 * ausencia de `guildConfigs/{guildId}` e tratada como erro claro, porque o
 * painel nunca deveria ser o primeiro a tocar essa colecao.
 */
export async function getGuildConfig(env: AppEnv, guildId: string): Promise<GuildConfig> {
  ensureFirebaseApp(env);

  const snapshot = await getFirestore().collection("guildConfigs").doc(guildId).get();
  if (!snapshot.exists) {
    throw new Error(
      `Documento guildConfigs/${guildId} nao encontrado no Firestore. O bot precisa ter rodado ao menos uma vez nesta guild antes do painel.`
    );
  }

  return snapshot.data() as GuildConfig;
}

/**
 * Busca o `founderRoleId` configurado para a guild no Firestore.
 * Usado pela autorizacao de login/reconferencia de cargos.
 */
export async function getFounderRoleId(env: AppEnv, guildId: string): Promise<string> {
  const config = await getGuildConfig(env, guildId);
  if (!config.founderRoleId) {
    throw new Error(`guildConfigs/${guildId} nao possui founderRoleId configurado.`);
  }

  return config.founderRoleId;
}
