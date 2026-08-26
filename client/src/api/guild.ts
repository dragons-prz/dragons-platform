import type {
  DiscordChannelSummary,
  DiscordEmojiSummary,
  DiscordRoleSummary,
  GuildConfig
} from "@dragons/shared";

import { apiGet } from "./client";

export function fetchGuildConfig(signal?: AbortSignal): Promise<GuildConfig> {
  return apiGet<GuildConfig>("/api/config", signal);
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
