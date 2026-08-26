import type {
  DiscordChannelSummary,
  DiscordEmojiSummary,
  DiscordRoleSummary,
  GuildConfig,
  GuildConfigHealthResponse,
  UpdateGuildConfigRequest
} from "@dragons/shared";

import { apiGet, apiPatch } from "./client";

export function fetchGuildConfig(signal?: AbortSignal): Promise<GuildConfig> {
  return apiGet<GuildConfig>("/api/config", signal);
}

export function updateGuildConfig(body: UpdateGuildConfigRequest): Promise<GuildConfig> {
  return apiPatch<GuildConfig>("/api/config", body);
}

export function fetchGuildConfigHealth(signal?: AbortSignal): Promise<GuildConfigHealthResponse> {
  return apiGet<GuildConfigHealthResponse>("/api/config/health", signal);
}

export function fetchGuildChannels(signal?: AbortSignal): Promise<DiscordChannelSummary[]> {
  return apiGet<DiscordChannelSummary[]>("/api/guild/channels", signal);
}

export function fetchGuildRoles(signal?: AbortSignal): Promise<DiscordRoleSummary[]> {
  return apiGet<DiscordRoleSummary[]>("/api/guild/roles", signal);
}

export function fetchGuildEmojis(signal?: AbortSignal): Promise<DiscordEmojiSummary[]> {
  return apiGet<DiscordEmojiSummary[]>("/api/guild/emojis", signal);
}
