import "dotenv/config";

/**
 * Variaveis de ambiente do servidor.
 *
 * Fase 1 (autenticacao): as chaves de OAuth do Discord, o segredo de
 * sessao e o caminho da service account do Firebase agora sao
 * obrigatorias — o servidor falha cedo na subida se alguma faltar, com
 * mensagem clara (mesmo padrao de `dragonsbot/src/config/env.ts`).
 */

export interface AppEnv {
  port: number;
  discordClientId: string;
  discordClientSecret: string;
  discordToken: string;
  discordGuildId: string;
  discordRedirectUri: string;
  sessionSecret: string;
  firebaseServiceAccountPath: string;
  clientOrigin: string;
  nodeEnv: string;
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
    discordClientId: required("DISCORD_CLIENT_ID"),
    discordClientSecret: required("DISCORD_CLIENT_SECRET"),
    discordToken: required("DISCORD_TOKEN"),
    discordGuildId: required("DISCORD_GUILD_ID"),
    discordRedirectUri: required("DISCORD_REDIRECT_URI"),
    sessionSecret: required("SESSION_SECRET"),
    firebaseServiceAccountPath: required("FIREBASE_SERVICE_ACCOUNT_PATH"),
    // Origem do SPA para onde o fluxo OAuth deve redirecionar de volta
    // apos o callback (o navegador navega ate o backend via
    // DISCORD_REDIRECT_URI, depois precisa voltar para o frontend). Nao
    // existia no .env.example da fase 0 — mantida opcional com o default
    // do Vite dev server para nao quebrar quem ja tinha um .env sem essa
    // chave.
    clientOrigin: optional("CLIENT_ORIGIN") ?? "http://localhost:5173",
    nodeEnv: optional("NODE_ENV") ?? "development"
  };
}
