import type { PanelJob } from "@dragons/shared";
import { getFirestore } from "firebase-admin/firestore";

import type { AppEnv } from "../config/env.js";
import { ensureFirebaseApp } from "./guild-config-repository.js";

/**
 * Leitura e escrita da colecao `panelJobs` — o MESMO formato que
 * `dragonsbot/src/storage/firestore/FirestoreDragonsStore.ts` consome no
 * worker `startPanelJobWorker` (roda a cada 5s, ja em producao). Este
 * repositorio SO cria jobs e le o mais recente; claim/complete/fail sao
 * responsabilidade exclusiva do worker do bot — o painel nunca deve tocar
 * `status`/`messageId`/`attempts`/`error` depois de criar o job.
 */

function panelJobsCollection() {
  return getFirestore().collection("panelJobs");
}

export interface CreatePanelJobInput {
  guildId: string;
  panelId: string;
  channelId: string;
  requestedByUserId: string;
}

/** Cria um novo job `pending` de publicacao/atualizacao de painel. */
export async function createPanelJob(env: AppEnv, input: CreatePanelJobInput): Promise<PanelJob> {
  ensureFirebaseApp(env);

  const ref = panelJobsCollection().doc();
  const now = new Date().toISOString();
  const job: PanelJob = {
    id: ref.id,
    guildId: input.guildId,
    panelId: input.panelId,
    channelId: input.channelId,
    requestedByUserId: input.requestedByUserId,
    status: "pending",
    messageId: null,
    attempts: 0,
    error: null,
    createdAt: now,
    updatedAt: now
  };
  await ref.set(job);
  return job;
}

/** Busca o job mais recente (por `createdAt`) para um painel especifico. `null` se nunca houve um. */
export async function getLatestPanelJobForPanel(
  env: AppEnv,
  guildId: string,
  panelId: string
): Promise<PanelJob | null> {
  ensureFirebaseApp(env);

  // So filtros de igualdade (sem `.orderBy` num campo diferente) — evita
  // exigir um indice composto novo no Firestore so para essa consulta de
  // baixo volume. Ordenacao por `createdAt` feita em memoria, mesmo padrao
  // de `FirestoreDragonsStore.claimNextPendingPanelJob` no bot.
  const snapshot = await panelJobsCollection()
    .where("guildId", "==", guildId)
    .where("panelId", "==", panelId)
    .get();

  if (snapshot.empty) return null;

  const jobs = snapshot.docs.map((doc) => doc.data() as PanelJob);
  return jobs.reduce((latest, job) => (job.createdAt > latest.createdAt ? job : latest));
}
