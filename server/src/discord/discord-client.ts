import type { AppEnv } from "../config/env.js";

const DISCORD_API_BASE = "https://discord.com/api/v10";
const GUILD_CACHE_TTL_MS = 60_000;

export interface DiscordOAuthUser {
  id: string;
  username: string;
  avatar: string | null;
}

export interface DiscordGuildMember {
  roles: string[];
}

export interface DiscordGuild {
  id: string;
  owner_id: string;
}

export interface DiscordRole {
  id: string;
  permissions: string;
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/**
 * Cache em memoria (por processo) das respostas de guild/roles, para nao
 * bater na API do Discord a cada login. TTL curto (~60s) porque cargos e
 * dono do servidor mudam raramente, mas nao devem ficar presos para
 * sempre em cache.
 */
const guildCache = new Map<string, CacheEntry<DiscordGuild>>();
const rolesCache = new Map<string, CacheEntry<DiscordRole[]>>();

function getCached<T>(cache: Map<string, CacheEntry<T>>, key: string): T | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt < Date.now()) {
    cache.delete(key);
    return undefined;
  }
  return entry.value;
}

function setCached<T>(cache: Map<string, CacheEntry<T>>, key: string, value: T): void {
  cache.set(key, { value, expiresAt: Date.now() + GUILD_CACHE_TTL_MS });
}

class DiscordApiError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "DiscordApiError";
  }
}

/**
 * Troca o `code` do fluxo OAuth por um access token.
 * NUNCA logue o retorno desta funcao (contem access_token/refresh_token).
 */
export async function exchangeCodeForToken(
  env: AppEnv,
  code: string
): Promise<{ accessToken: string }> {
  const body = new URLSearchParams({
    client_id: env.discordClientId,
    client_secret: env.discordClientSecret,
    grant_type: "authorization_code",
    code,
    redirect_uri: env.discordRedirectUri
  });

  const response = await fetch(`${DISCORD_API_BASE}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });

  if (!response.ok) {
    throw new DiscordApiError(response.status, "Falha ao trocar code por access token no Discord");
  }

  const data = (await response.json()) as { access_token: string };
  return { accessToken: data.access_token };
}

/**
 * Busca a identidade do usuario logado (id/username/avatar), usando o
 * access token dele. Usado SOMENTE para descobrir quem e o usuario — a
 * decisao de autorizacao usa o token do bot, nunca este token.
 */
export async function getOAuthUser(accessToken: string): Promise<DiscordOAuthUser> {
  const response = await fetch(`${DISCORD_API_BASE}/users/@me`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!response.ok) {
    throw new DiscordApiError(response.status, "Falha ao buscar usuario no Discord");
  }

  return (await response.json()) as DiscordOAuthUser;
}

function botHeaders(env: AppEnv): Record<string, string> {
  return { Authorization: `Bot ${env.discordToken}` };
}

/**
 * Busca o membro da guild pelo ID, usando o token do bot.
 * Retorna `null` se o usuario nao esta no servidor (404 do Discord).
 */
export async function getGuildMember(
  env: AppEnv,
  guildId: string,
  userId: string
): Promise<DiscordGuildMember | null> {
  const response = await fetch(`${DISCORD_API_BASE}/guilds/${guildId}/members/${userId}`, {
    headers: botHeaders(env)
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new DiscordApiError(response.status, "Falha ao buscar membro da guild no Discord");
  }

  return (await response.json()) as DiscordGuildMember;
}

/** Busca dados da guild (para descobrir `owner_id`), cacheado ~60s. */
export async function getGuild(env: AppEnv, guildId: string): Promise<DiscordGuild> {
  const cached = getCached(guildCache, guildId);
  if (cached) return cached;

  const response = await fetch(`${DISCORD_API_BASE}/guilds/${guildId}`, {
    headers: botHeaders(env)
  });

  if (!response.ok) {
    throw new DiscordApiError(response.status, "Falha ao buscar guild no Discord");
  }

  const guild = (await response.json()) as DiscordGuild;
  setCached(guildCache, guildId, guild);
  return guild;
}

/** Busca todos os cargos da guild (com `permissions`), cacheado ~60s. */
export async function getGuildRoles(env: AppEnv, guildId: string): Promise<DiscordRole[]> {
  const cached = getCached(rolesCache, guildId);
  if (cached) return cached;

  const response = await fetch(`${DISCORD_API_BASE}/guilds/${guildId}/roles`, {
    headers: botHeaders(env)
  });

  if (!response.ok) {
    throw new DiscordApiError(response.status, "Falha ao buscar cargos da guild no Discord");
  }

  const roles = (await response.json()) as DiscordRole[];
  setCached(rolesCache, guildId, roles);
  return roles;
}
