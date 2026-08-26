import type { PanelConfig } from "@dragons/shared";

import { apiGet } from "./client";

export function fetchPanels(signal?: AbortSignal): Promise<PanelConfig[]> {
  return apiGet<PanelConfig[]>("/api/panels", signal);
}

export function fetchPanel(id: string, signal?: AbortSignal): Promise<PanelConfig> {
  return apiGet<PanelConfig>(`/api/panels/${encodeURIComponent(id)}`, signal);
}
