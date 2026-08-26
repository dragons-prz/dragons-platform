import { cert, getApps, initializeApp } from "firebase-admin/app";
import type { ServiceAccount } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "node:fs";

import type { AppEnv } from "../config/env.js";

/**
 * Formato minimo do documento `guildConfigs/{guildId}` no Firestore.
 * Espelha `GuildConfig` de `@dragons/shared` (que por sua vez espelha
 * `dragonsbot/src/domain/types.ts`) — mas so lemos o campo que a fase 1
 * precisa (`founderRoleId`). Nao criamos o documento se faltar: quem cria
 * e o bot.
 */
interface GuildConfigDocument {
  founderRoleId?: string;
}

let firestoreInitialized = false;

function loadServiceAccount(path: string): ServiceAccount {
  return JSON.parse(readFileSync(path, "utf8")) as ServiceAccount;
}

function ensureFirebaseApp(env: AppEnv): void {
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
 * Busca o `founderRoleId` configurado para a guild no Firestore.
 *
 * Diferente do bot, o painel NAO cria o documento se ele nao existir —
 * ausencia de `guildConfigs/{guildId}` (ou do campo `founderRoleId`) e
 * tratada como erro claro, porque o painel nunca deveria ser o primeiro a
 * tocar essa colecao.
 */
export async function getFounderRoleId(env: AppEnv, guildId: string): Promise<string> {
  ensureFirebaseApp(env);

  const snapshot = await getFirestore().collection("guildConfigs").doc(guildId).get();
  if (!snapshot.exists) {
    throw new Error(
      `Documento guildConfigs/${guildId} nao encontrado no Firestore. O bot precisa ter rodado ao menos uma vez nesta guild antes do painel.`
    );
  }

  const data = snapshot.data() as GuildConfigDocument;
  if (!data.founderRoleId) {
    throw new Error(`guildConfigs/${guildId} nao possui founderRoleId configurado.`);
  }

  return data.founderRoleId;
}
