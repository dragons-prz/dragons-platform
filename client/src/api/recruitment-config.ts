import type { RecruitmentFlowConfig, UpdateRecruitmentConfigRequest } from "@dragons/shared";

import { apiGet, apiPut } from "./client";

export function fetchRecruitmentConfig(signal?: AbortSignal): Promise<RecruitmentFlowConfig> {
  return apiGet<RecruitmentFlowConfig>("/api/recruitment-config", signal);
}

export function saveRecruitmentConfig(
  body: UpdateRecruitmentConfigRequest
): Promise<RecruitmentFlowConfig> {
  return apiPut<RecruitmentFlowConfig>("/api/recruitment-config", body);
}
