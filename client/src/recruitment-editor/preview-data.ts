import type { RecruitmentAreaOption, RecruitmentStarterRoleOption } from "@dragons/shared";

/** Troca `{chave}` pelos valores da previa — mesma regra do `renderTemplate` do bot. */
export function applyTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => vars[key] ?? match);
}

/** Valores de exemplo usados em toda previa desta pagina. */
export function buildPreviewVars(input: {
  step: number;
  role: string;
  areas: string;
  min: number;
  max: number;
  points: number;
}): Record<string, string> {
  return {
    step: String(input.step),
    total: "3",
    recruited: "@scarlet",
    recruitedId: "766494163562266674",
    recruitedTag: "scarlet",
    recruiter: "@mavy",
    recruiterId: "1496608104102625531",
    recruiterTag: "mavy",
    role: input.role,
    areas: input.areas,
    min: String(input.min),
    max: String(input.max),
    points: String(input.points),
    createdAt: "quinta-feira, 15 de outubro de 2020 23:54",
    approver: "@lider"
  };
}

/** Rotulos de exemplo tirados das opcoes ja cadastradas (ou placeholders). */
export function sampleSelections(
  starterRoles: RecruitmentStarterRoleOption[],
  areas: RecruitmentAreaOption[],
  maxAreas: number
): { role: string; areas: RecruitmentAreaOption[] } {
  return {
    role: starterRoles[0]?.label ?? "Hope",
    areas: areas.slice(0, Math.max(1, maxAreas))
  };
}
