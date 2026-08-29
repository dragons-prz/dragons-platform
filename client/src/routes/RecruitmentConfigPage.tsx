import type {
  DiscordChannelSummary,
  DiscordRoleSummary,
  RecruitmentFlowConfig,
  RecruitmentPointsMode,
  UpdateRecruitmentConfigRequest
} from "@dragons/shared";
import {
  calculateRecruitmentPoints,
  collectRecruitmentConfigWarnings,
  RECRUITMENT_LIMITS,
  validateRecruitmentConfig
} from "@dragons/shared";
import type { ReactNode } from "react";
import { useState } from "react";

import { ApiError } from "../api/client";
import { fetchGuildChannels, fetchGuildRoles } from "../api/guild";
import { fetchRecruitmentConfig, saveRecruitmentConfig } from "../api/recruitment-config";
import { ErrorScreen, LoadingScreen } from "../components/StatusScreen";
import { WarningIcon } from "../components/icons";
import { usePresenceLocation } from "../context/PresenceContext";
import { useApiData } from "../hooks/useApiData";
import { useUnsavedChangesWarning } from "../panel-editor/useUnsavedChangesWarning";
import { ButtonConfigEditor } from "../recruitment-editor/ButtonConfigEditor";
import { MessageEditor } from "../recruitment-editor/MessageEditor";
import { AreaListEditor, StarterRoleListEditor } from "../recruitment-editor/OptionListEditor";
import { buildPreviewVars, sampleSelections } from "../recruitment-editor/preview-data";
import { RecruitmentMessagePreview } from "../recruitment-editor/RecruitmentPreview";

type TabId = "opcoes" | "etapa1" | "etapa2" | "etapa3" | "desfechos" | "ficha" | "permissoes";

const TABS: { id: TabId; label: string }[] = [
  { id: "opcoes", label: "Cargos e áreas" },
  { id: "etapa1", label: "Etapa 1" },
  { id: "etapa2", label: "Etapa 2" },
  { id: "etapa3", label: "Etapa 3" },
  { id: "desfechos", label: "Desfechos" },
  { id: "ficha", label: "Ficha" },
  { id: "permissoes", label: "Permissões e pontos" }
];

const INPUT_CLASS =
  "rounded-lg border border-line bg-ground px-3 py-2 font-body text-sm text-ink outline-none focus-visible:border-ember";

export function RecruitmentConfigPage() {
  usePresenceLocation("recruitment");
  const configState = useApiData(fetchRecruitmentConfig, []);
  const rolesState = useApiData(fetchGuildRoles, []);
  const channelsState = useApiData(fetchGuildChannels, []);

  if (
    configState.status === "loading" ||
    rolesState.status === "loading" ||
    channelsState.status === "loading"
  ) {
    return <LoadingScreen label="Carregando configuração de recrutamento..." />;
  }
  if (configState.status === "error") {
    return (
      <ErrorScreen title="Não foi possível carregar a configuração" message={configState.message} />
    );
  }
  if (rolesState.status === "error") {
    return <ErrorScreen title="Não foi possível carregar os cargos" message={rolesState.message} />;
  }
  if (channelsState.status === "error") {
    return (
      <ErrorScreen title="Não foi possível carregar os canais" message={channelsState.message} />
    );
  }

  return (
    <RecruitmentForm
      initial={configState.data}
      roles={rolesState.data}
      channels={channelsState.data}
    />
  );
}

/** O documento sem os campos que o servidor gera — e o corpo do PUT. */
function toFormState(config: RecruitmentFlowConfig): UpdateRecruitmentConfigRequest {
  const rest: Record<string, unknown> = { ...config };
  delete rest.guildId;
  delete rest.createdAt;
  delete rest.updatedAt;
  return rest as UpdateRecruitmentConfigRequest;
}

function RecruitmentForm({
  initial,
  roles,
  channels
}: {
  initial: RecruitmentFlowConfig;
  roles: DiscordRoleSummary[];
  channels: DiscordChannelSummary[];
}) {
  const [saved, setSaved] = useState(initial);
  const [form, setForm] = useState<UpdateRecruitmentConfigRequest>(() => toFormState(initial));
  const [tab, setTab] = useState<TabId>("opcoes");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

  const isDirty = JSON.stringify(form) !== JSON.stringify(toFormState(saved));
  useUnsavedChangesWarning(isDirty);

  const shapeError = validateRecruitmentConfig(form);
  const warnings = collectRecruitmentConfigWarnings(form);
  const canSave = saveState !== "saving" && isDirty && !shapeError;

  function update<K extends keyof UpdateRecruitmentConfigRequest>(
    key: K,
    value: UpdateRecruitmentConfigRequest[K]
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function toggleRole(key: "approverRoleIds" | "pointsGrantRoleIds", roleId: string) {
    setForm((current) => {
      const set = new Set(current[key]);
      if (set.has(roleId)) set.delete(roleId);
      else set.add(roleId);
      return { ...current, [key]: [...set] };
    });
  }

  async function handleSave() {
    if (!canSave) return;
    setSaveState("saving");
    setSaveError(null);
    try {
      const updated = await saveRecruitmentConfig(form);
      setSaved(updated);
      setForm(toFormState(updated));
      setSaveState("saved");
      window.setTimeout(
        () => setSaveState((current) => (current === "saved" ? "idle" : current)),
        2500
      );
    } catch (error) {
      setSaveState("error");
      setSaveError(
        error instanceof ApiError ? error.message : "Não foi possível salvar a configuração."
      );
    }
  }

  const sample = sampleSelections(form.starterRoles, form.areas, form.maxAreas);
  const samplePoints = calculateRecruitmentPoints(sample.areas, form.pointsMode);
  const areasLabel = sample.areas.map((area) => area.label).join(", ");

  function vars(step: number, withRole: boolean, withAreas: boolean) {
    return buildPreviewVars({
      step,
      role: withRole ? sample.role : form.rolePendingText,
      areas: withAreas ? areasLabel || form.areasPendingText : form.areasPendingText,
      min: form.minAreas,
      max: form.maxAreas,
      points: samplePoints
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-bold text-ink">Recrutamento</h1>
        <p className="font-body text-sm text-ink-muted">
          Tudo que o <code className="font-mono">/recrutar</code> mostra e aplica. As mudanças valem
          para os <strong>próximos</strong> recrutamentos — wizards em andamento e fichas já
          enviadas mantêm o formato com que nasceram.
        </p>
        <p className="font-body text-sm text-ink-muted">
          As três etapas e os desfechos são a <strong>mesma</strong> mensagem, editada a cada passo
          — e o Discord não deixa uma mensagem trocar de formato depois de enviada. Por isso o
          formato da <strong>etapa 1</strong> vale para todo o wizard. A ficha é outra mensagem e
          tem formato próprio.
        </p>
      </div>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Seções da configuração">
        {TABS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            role="tab"
            aria-selected={tab === entry.id}
            onClick={() => setTab(entry.id)}
            className={`rounded-lg border px-3 py-1.5 font-display text-sm font-medium transition-colors ${
              tab === entry.id
                ? "border-ink bg-surface-2 text-ink"
                : "border-line text-ink-muted hover:border-ink-muted hover:text-ink"
            }`}
          >
            {entry.label}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-5 rounded-xl border border-line bg-surface p-4 sm:p-6">
          {tab === "opcoes" ? (
            <>
              <Section
                title="Cargos de iniciante (etapa 1)"
                hint="Cada opção do dropdown aplica um cargo ao recrutado quando a ficha é aprovada."
              >
                <StarterRoleListEditor
                  options={form.starterRoles}
                  roles={roles}
                  onChange={(next) => update("starterRoles", next)}
                />
              </Section>

              <Section
                title="Áreas (etapa 2)"
                hint="Cada área aplica um ou mais cargos e vale pontos para o recrutador."
              >
                <AreaListEditor
                  options={form.areas}
                  roles={roles}
                  onChange={(next) => update("areas", next)}
                />
                <div className="flex flex-wrap gap-4">
                  <NumberField
                    label="Mínimo de áreas"
                    value={form.minAreas}
                    min={1}
                    max={RECRUITMENT_LIMITS.MAX_OPTIONS}
                    onChange={(value) => update("minAreas", value)}
                  />
                  <NumberField
                    label="Máximo de áreas"
                    value={form.maxAreas}
                    min={1}
                    max={RECRUITMENT_LIMITS.MAX_OPTIONS}
                    onChange={(value) => update("maxAreas", value)}
                  />
                </div>
              </Section>
            </>
          ) : null}

          {tab === "etapa1" ? (
            <Section title="Etapa 1 — cargo de iniciante">
              <MessageEditor
                message={form.stepOne.message}
                onChange={(message) => update("stepOne", { ...form.stepOne, message })}
              />
              <TextField
                label="Texto do dropdown"
                value={form.stepOne.select.placeholder}
                onChange={(placeholder) =>
                  update("stepOne", { ...form.stepOne, select: { placeholder } })
                }
              />
              <ButtonConfigEditor
                label="Botão Cancelar"
                button={form.stepOne.cancelButton}
                onChange={(cancelButton) => update("stepOne", { ...form.stepOne, cancelButton })}
              />
            </Section>
          ) : null}

          {tab === "etapa2" ? (
            <Section title="Etapa 2 — áreas">
              <MessageEditor
                message={form.stepTwo.message}
                onChange={(message) => update("stepTwo", { ...form.stepTwo, message })}
              />
              <TextField
                label="Texto do dropdown"
                value={form.stepTwo.select.placeholder}
                onChange={(placeholder) =>
                  update("stepTwo", { ...form.stepTwo, select: { placeholder } })
                }
              />
              <ButtonConfigEditor
                label="Botão Voltar"
                button={form.stepTwo.backButton}
                onChange={(backButton) => update("stepTwo", { ...form.stepTwo, backButton })}
              />
              <ButtonConfigEditor
                label="Botão Cancelar"
                button={form.stepTwo.cancelButton}
                onChange={(cancelButton) => update("stepTwo", { ...form.stepTwo, cancelButton })}
              />
            </Section>
          ) : null}

          {tab === "etapa3" ? (
            <Section title="Etapa 3 — confirmação">
              <MessageEditor
                message={form.stepThree.message}
                onChange={(message) => update("stepThree", { ...form.stepThree, message })}
              />
              <ButtonConfigEditor
                label="Botão Confirmar"
                button={form.stepThree.confirmButton}
                onChange={(confirmButton) =>
                  update("stepThree", { ...form.stepThree, confirmButton })
                }
              />
              <ButtonConfigEditor
                label="Botão Reiniciar"
                button={form.stepThree.restartButton}
                onChange={(restartButton) =>
                  update("stepThree", { ...form.stepThree, restartButton })
                }
              />
              <ButtonConfigEditor
                label="Botão Cancelar"
                button={form.stepThree.cancelButton}
                onChange={(cancelButton) =>
                  update("stepThree", { ...form.stepThree, cancelButton })
                }
              />
            </Section>
          ) : null}

          {tab === "desfechos" ? (
            <>
              <Section
                title="Ficha enviada"
                hint="Substitui o wizard depois que o recrutador confirma."
              >
                <MessageEditor
                  message={form.outcome.submitted}
                  onChange={(submitted) => update("outcome", { ...form.outcome, submitted })}
                />
              </Section>
              <Section title="Cancelado">
                <MessageEditor
                  message={form.outcome.cancelled}
                  onChange={(cancelled) => update("outcome", { ...form.outcome, cancelled })}
                />
              </Section>
              <Section
                title="Expirado"
                hint={`Aplicada quando o rascunho fica ${form.draftTtlMinutes} minutos parado.`}
              >
                <MessageEditor
                  message={form.outcome.expired}
                  onChange={(expired) => update("outcome", { ...form.outcome, expired })}
                />
              </Section>
            </>
          ) : null}

          {tab === "ficha" ? (
            <>
              <Section title="Canal e formato da ficha">
                <label className="flex flex-col gap-1">
                  <span className="font-body text-xs font-medium text-ink-muted">
                    Canal onde a ficha é postada
                  </span>
                  <select
                    value={form.sheet.channelId ?? ""}
                    onChange={(event) =>
                      update("sheet", {
                        ...form.sheet,
                        channelId: event.target.value === "" ? null : event.target.value
                      })
                    }
                    className={INPUT_CLASS}
                  >
                    <option value="">Selecione o canal...</option>
                    {channels.map((channel) => (
                      <option key={channel.id} value={channel.id}>
                        #{channel.name}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="flex flex-col gap-1">
                  <span className="font-body text-xs font-medium text-ink-muted">
                    Foto do recrutado
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        ["thumbnail", "Miniatura à direita"],
                        ["image", "Banner"],
                        ["none", "Sem foto"]
                      ] as const
                    ).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => update("sheet", { ...form.sheet, avatarPlacement: value })}
                        className={`rounded-lg border px-3 py-1.5 font-body text-sm transition-colors ${
                          form.sheet.avatarPlacement === value
                            ? "border-ink text-ink"
                            : "border-line text-ink-muted hover:border-ink-muted hover:text-ink"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <label className="flex items-center gap-2 font-body text-sm text-ink">
                  <input
                    type="checkbox"
                    checked={form.sheet.mentionApprovers}
                    onChange={(event) =>
                      update("sheet", { ...form.sheet, mentionApprovers: event.target.checked })
                    }
                  />
                  Marcar os cargos aprovadores ao postar a ficha
                </label>

                <MessageEditor
                  message={form.sheet.message}
                  onChange={(message) => update("sheet", { ...form.sheet, message })}
                />
                <ButtonConfigEditor
                  label="Botão Confirmar"
                  button={form.sheet.approveButton}
                  onChange={(approveButton) => update("sheet", { ...form.sheet, approveButton })}
                />
                <ButtonConfigEditor
                  label="Botão Rejeitar"
                  button={form.sheet.rejectButton}
                  onChange={(rejectButton) => update("sheet", { ...form.sheet, rejectButton })}
                />
              </Section>

              <Section
                title="Ficha em processamento"
                hint="Enquanto o bot aplica os cargos, logo depois do clique em Confirmar."
              >
                <MessageEditor
                  message={form.sheet.queued}
                  onChange={(queued) => update("sheet", { ...form.sheet, queued })}
                />
              </Section>

              <Section title="Ficha aprovada">
                <MessageEditor
                  message={form.sheet.approved}
                  onChange={(approved) => update("sheet", { ...form.sheet, approved })}
                />
                <ButtonConfigEditor
                  label="Botão travado (aprovada)"
                  button={form.sheet.approvedButton}
                  onChange={(approvedButton) => update("sheet", { ...form.sheet, approvedButton })}
                />
              </Section>

              <Section title="Ficha rejeitada">
                <MessageEditor
                  message={form.sheet.rejected}
                  onChange={(rejected) => update("sheet", { ...form.sheet, rejected })}
                />
                <ButtonConfigEditor
                  label="Botão travado (rejeitada)"
                  button={form.sheet.rejectedButton}
                  onChange={(rejectedButton) => update("sheet", { ...form.sheet, rejectedButton })}
                />
              </Section>
            </>
          ) : null}

          {tab === "permissoes" ? (
            <>
              <Section
                title="Quem aprova a ficha"
                hint="Só estes cargos conseguem clicar em Confirmar ou Rejeitar."
              >
                <RolePicker
                  roles={roles}
                  selected={form.approverRoleIds}
                  onToggle={(roleId) => toggleRole("approverRoleIds", roleId)}
                />
              </Section>

              <Section title="Quem pode dar pontos" hint="Cargos autorizados a usar /pontos-dar.">
                <RolePicker
                  roles={roles}
                  selected={form.pointsGrantRoleIds}
                  onToggle={(roleId) => toggleRole("pointsGrantRoleIds", roleId)}
                />
              </Section>

              <Section title="Pontuação">
                <div className="flex flex-col gap-1">
                  <span className="font-body text-xs font-medium text-ink-muted">
                    Quando o recrutador escolhe mais de uma área
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        ["sum", "Somar as áreas"],
                        ["highest", "Usar a maior"]
                      ] as [RecruitmentPointsMode, string][]
                    ).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => update("pointsMode", value)}
                        className={`rounded-lg border px-3 py-1.5 font-body text-sm transition-colors ${
                          form.pointsMode === value
                            ? "border-ink text-ink"
                            : "border-line text-ink-muted hover:border-ink-muted hover:text-ink"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <p className="font-body text-xs text-ink-muted">
                    Com as áreas atuais, o exemplo da prévia daria <strong>{samplePoints}</strong>{" "}
                    pontos.
                  </p>
                </div>

                <div className="flex flex-wrap gap-4">
                  <NumberField
                    label="Mínimo do /pontos-dar"
                    value={form.minManualPoints}
                    min={-RECRUITMENT_LIMITS.MAX_MANUAL_POINTS}
                    max={0}
                    onChange={(value) => update("minManualPoints", value)}
                  />
                  <NumberField
                    label="Máximo do /pontos-dar"
                    value={form.maxManualPoints}
                    min={0}
                    max={RECRUITMENT_LIMITS.MAX_MANUAL_POINTS}
                    onChange={(value) => update("maxManualPoints", value)}
                  />
                  <NumberField
                    label="Expiração do rascunho (min)"
                    value={form.draftTtlMinutes}
                    min={RECRUITMENT_LIMITS.DRAFT_TTL_MIN}
                    max={RECRUITMENT_LIMITS.DRAFT_TTL_MAX}
                    onChange={(value) => update("draftTtlMinutes", value)}
                  />
                </div>
              </Section>

              <Section
                title="Textos avulsos"
                hint="Placeholders dos campos antes da seleção e respostas de bloqueio."
              >
                <TextField
                  label="Cargo ainda não escolhido"
                  value={form.rolePendingText}
                  onChange={(value) => update("rolePendingText", value)}
                />
                <TextField
                  label="Áreas ainda não escolhidas"
                  value={form.areasPendingText}
                  onChange={(value) => update("areasPendingText", value)}
                />
                <TextField
                  label="Sem cargo de recrutador"
                  value={form.notRecruiterMessage}
                  onChange={(value) => update("notRecruiterMessage", value)}
                />
                <TextField
                  label="Sem permissão para aprovar"
                  value={form.notApproverMessage}
                  onChange={(value) => update("notApproverMessage", value)}
                />
                <TextField
                  label="Não é o dono do rascunho"
                  value={form.notDraftOwnerMessage}
                  onChange={(value) => update("notDraftOwnerMessage", value)}
                />
                <TextField
                  label="Fluxo não configurado"
                  value={form.notConfiguredMessage}
                  onChange={(value) => update("notConfiguredMessage", value)}
                />
              </Section>
            </>
          ) : null}
        </div>

        <div className="flex flex-col gap-3">
          <h2 className="font-display text-sm font-semibold text-ink-muted">Prévia</h2>
          {tab === "etapa1" || tab === "opcoes" ? (
            <RecruitmentMessagePreview
              message={form.stepOne.message}
              vars={vars(1, false, false)}
              buttons={[form.stepOne.cancelButton]}
              select={{ placeholder: form.stepOne.select.placeholder, options: form.starterRoles }}
            />
          ) : null}
          {tab === "etapa2" ? (
            <RecruitmentMessagePreview
              message={form.stepTwo.message}
              vars={vars(2, true, false)}
              buttons={[form.stepTwo.backButton, form.stepTwo.cancelButton]}
              select={{ placeholder: form.stepTwo.select.placeholder, options: form.areas }}
            />
          ) : null}
          {tab === "etapa3" ? (
            <RecruitmentMessagePreview
              message={form.stepThree.message}
              vars={vars(3, true, true)}
              buttons={[
                form.stepThree.confirmButton,
                form.stepThree.restartButton,
                form.stepThree.cancelButton
              ]}
            />
          ) : null}
          {tab === "desfechos" ? (
            <>
              <RecruitmentMessagePreview
                message={form.outcome.submitted}
                vars={vars(3, true, true)}
              />
              <RecruitmentMessagePreview
                message={form.outcome.cancelled}
                vars={vars(3, true, true)}
              />
              <RecruitmentMessagePreview
                message={form.outcome.expired}
                vars={vars(3, true, true)}
              />
            </>
          ) : null}
          {tab === "ficha" ? (
            <>
              <RecruitmentMessagePreview
                message={form.sheet.message}
                vars={vars(3, true, true)}
                buttons={[form.sheet.approveButton, form.sheet.rejectButton]}
                avatarPlacement={form.sheet.avatarPlacement}
              />
              <RecruitmentMessagePreview
                message={form.sheet.approved}
                vars={vars(3, true, true)}
                buttons={[form.sheet.approvedButton]}
                avatarPlacement={form.sheet.avatarPlacement}
              />
              <RecruitmentMessagePreview
                message={form.sheet.rejected}
                vars={vars(3, true, true)}
                buttons={[form.sheet.rejectedButton]}
                avatarPlacement={form.sheet.avatarPlacement}
              />
            </>
          ) : null}
          {tab === "permissoes" ? (
            <p className="font-body text-sm text-ink-muted">
              Esta seção não muda nenhuma mensagem — veja a prévia nas abas de etapa e ficha.
            </p>
          ) : null}
        </div>
      </div>

      {warnings.length > 0 ? (
        <div className="flex flex-col gap-2 rounded-xl border border-warn/50 bg-warn/10 p-4">
          {warnings.map((warning) => (
            <p key={warning} className="flex items-start gap-2 font-body text-sm text-ink">
              <WarningIcon className="mt-0.5 h-4 w-4 shrink-0 text-warn" />
              {warning}
            </p>
          ))}
        </div>
      ) : null}

      {shapeError ? (
        <p role="alert" className="font-body text-sm text-danger">
          {shapeError}
        </p>
      ) : null}
      {saveError ? (
        <p role="alert" className="font-body text-sm text-danger">
          {saveError}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={!canSave}
          className="w-fit rounded-lg bg-ember px-5 py-2.5 font-display text-sm font-semibold text-on-accent transition-colors hover:bg-ember/85 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saveState === "saving" ? "Salvando..." : saveState === "saved" ? "Salvo" : "Salvar"}
        </button>
        {isDirty && saveState !== "saving" ? (
          <span className="font-body text-xs text-warn">Alterações não salvas</span>
        ) : null}
      </div>
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="font-display text-lg font-semibold text-ink">{title}</h2>
        {hint ? <p className="font-body text-xs text-ink-muted">{hint}</p> : null}
      </div>
      {children}
    </section>
  );
}

function TextField({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="font-body text-xs font-medium text-ink-muted">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={INPUT_CLASS}
      />
    </label>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  onChange
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="font-body text-xs font-medium text-ink-muted">{label}</span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(event) => {
          const parsed = Number.parseInt(event.target.value, 10);
          onChange(Number.isNaN(parsed) ? 0 : parsed);
        }}
        className={`w-36 ${INPUT_CLASS}`}
      />
    </label>
  );
}

function RolePicker({
  roles,
  selected,
  onToggle
}: {
  roles: DiscordRoleSummary[];
  selected: string[];
  onToggle: (roleId: string) => void;
}) {
  const selectedSet = new Set(selected);
  return (
    <div className="flex max-h-44 flex-col gap-1 overflow-y-auto rounded-lg border border-line bg-ground p-2">
      {roles.map((role) => (
        <label key={role.id} className="flex items-center gap-2 font-body text-sm text-ink">
          <input
            type="checkbox"
            checked={selectedSet.has(role.id)}
            onChange={() => onToggle(role.id)}
          />
          @{role.name}
        </label>
      ))}
    </div>
  );
}
