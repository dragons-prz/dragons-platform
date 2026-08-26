import type { CreatePanelRequest, PanelConfig, UpdatePanelRequest } from "@dragons/shared";

import { apiDelete, apiGet, apiPatch, apiPost } from "./client";

export function fetchPanels(signal?: AbortSignal): Promise<PanelConfig[]> {
  return apiGet<PanelConfig[]>("/api/panels", signal);
}

export function fetchPanel(id: string, signal?: AbortSignal): Promise<PanelConfig> {
  return apiGet<PanelConfig>(`/api/panels/${encodeURIComponent(id)}`, signal);
}

export function createPanel(body: CreatePanelRequest): Promise<PanelConfig> {
  return apiPost<PanelConfig>("/api/panels", body);
}

export function updatePanel(id: string, body: UpdatePanelRequest): Promise<PanelConfig> {
  return apiPatch<PanelConfig>(`/api/panels/${encodeURIComponent(id)}`, body);
}

export function deletePanel(id: string): Promise<void> {
  return apiDelete(`/api/panels/${encodeURIComponent(id)}`);
}
