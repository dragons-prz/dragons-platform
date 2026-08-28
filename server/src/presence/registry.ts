import type { PresenceUser } from "@dragons/shared";

/**
 * Registro em memoria (por processo) de "quem esta online agora". Segue o
 * mesmo espirito do `revalidationCache` em `auth/plugin.ts`: um `Map`
 * simples com evicção preguiçosa na leitura, sem timer de fundo.
 *
 * Um usuario e considerado ausente apos `PRESENCE_TTL_MS` sem heartbeat.
 * O client bate a cada ~20s (ver `client/src/context/PresenceContext.tsx`),
 * entao 45s da folga para uma batida perdida antes do avatar sumir.
 *
 * Nao ha persistencia: reiniciar o servidor zera a presenca (o proximo
 * heartbeat de cada aba aberta reconstroi em segundos). So funciona com
 * uma unica instancia do servidor.
 */
export const PRESENCE_TTL_MS = 45_000;

const registry = new Map<string, PresenceUser>();

/** Registra/renova a presenca de um usuario com o timestamp atual. */
export function recordPresence(user: Omit<PresenceUser, "lastSeenAt">): void {
  registry.set(user.id, { ...user, lastSeenAt: Date.now() });
}

/**
 * Lista os usuarios ativos (heartbeat dentro do TTL), removendo de passagem
 * os que expiraram. Ordenado por nome para a UI ficar estavel.
 */
export function listPresence(): PresenceUser[] {
  const cutoff = Date.now() - PRESENCE_TTL_MS;
  const active: PresenceUser[] = [];
  for (const [id, entry] of registry) {
    if (entry.lastSeenAt < cutoff) {
      registry.delete(id);
      continue;
    }
    active.push(entry);
  }
  return active.sort((a, b) => a.username.localeCompare(b.username));
}

/** Remove a presenca de um usuario na hora (logout / aba fechada). */
export function dropPresence(userId: string): void {
  registry.delete(userId);
}
