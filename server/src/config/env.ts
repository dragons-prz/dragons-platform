import "dotenv/config";

/**
 * Variaveis de ambiente do servidor.
 *
 * Fase 0 (scaffold): o servidor precisa subir sem nenhuma credencial real
 * configurada, entao apenas `PORT` e validado de forma estrita. As demais
 * chaves (Discord OAuth, sessao, Firebase) sao lidas de forma opcional por
 * enquanto e ficam `undefined` se ausentes.
 *
 * Quando as rotas de OAuth/Firestore forem implementadas, troque as
 * chamadas `optional(...)` correspondentes por `required(...)` (mesmo
 * padrao usado em `dragonsbot/src/config/env.ts`) para falhar cedo e com
 * mensagem clara caso a credencial esteja faltando.
 */

export interface AppEnv {
  port: number;
  discordClientId?: string;
  discordClientSecret?: string;
  discordToken?: string;
  discordGuildId?: string;
  discordRedirectUri?: string;
  sessionSecret?: string;
  firebaseServiceAccountPath?: string;
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variavel de ambiente obrigatoria ausente: ${name}`);
  }

  return value;
}

function optional(name: string): string | undefined {
  return process.env[name] || undefined;
}

export function loadEnv(): AppEnv {
  const rawPort = process.env.PORT;
  const port = rawPort ? Number(rawPort) : 3000;

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(`Variavel de ambiente PORT invalida: ${String(rawPort)}`);
  }

  return {
    port,
    discordClientId: optional("DISCORD_CLIENT_ID"),
    discordClientSecret: optional("DISCORD_CLIENT_SECRET"),
    discordToken: optional("DISCORD_TOKEN"),
    discordGuildId: optional("DISCORD_GUILD_ID"),
    discordRedirectUri: optional("DISCORD_REDIRECT_URI"),
    sessionSecret: optional("SESSION_SECRET"),
    firebaseServiceAccountPath: optional("FIREBASE_SERVICE_ACCOUNT_PATH")
  };
}

// Mantido para uso futuro (OAuth/Firestore) — evita import nao utilizado
// sinalizar erro de lint enquanto nao ha chamador ainda.
export { required };
