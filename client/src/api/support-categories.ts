import type {
  CreateSupportCategoryRequest,
  SupportCategoryConfig,
  UpdateSupportCategoryRequest
} from "@dragons/shared";

import { apiDelete, apiGet, apiPatch, apiPost } from "./client";

export function fetchSupportCategories(signal?: AbortSignal): Promise<SupportCategoryConfig[]> {
  return apiGet<SupportCategoryConfig[]>("/api/support-categories", signal);
}

export function fetchSupportCategory(
  id: string,
  signal?: AbortSignal
): Promise<SupportCategoryConfig> {
  return apiGet<SupportCategoryConfig>(`/api/support-categories/${encodeURIComponent(id)}`, signal);
}

export function createSupportCategory(
  body: CreateSupportCategoryRequest
): Promise<SupportCategoryConfig> {
  return apiPost<SupportCategoryConfig>("/api/support-categories", body);
}

export function updateSupportCategory(
  id: string,
  body: UpdateSupportCategoryRequest
): Promise<SupportCategoryConfig> {
  return apiPatch<SupportCategoryConfig>(`/api/support-categories/${encodeURIComponent(id)}`, body);
}

export function deleteSupportCategory(id: string): Promise<void> {
  return apiDelete(`/api/support-categories/${encodeURIComponent(id)}`);
}
