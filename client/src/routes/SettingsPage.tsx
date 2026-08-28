import type {
  DiscordChannelSummary,
  DiscordRoleSummary,
  GuildConfig,
  GuildConfigHealthCheck,
  GuildConfigHealthLevel,
  UpdateGuildConfigRequest
} from "@dragons/shared";
import { useState } from "react";

import { ApiError } from "../api/client";
import {
  fetchGuildChannels,
  fetchGuildConfig,
  fetchGuildConfigHealth,
  fetchGuildRoles,
  updateGuildConfig
} from "../api/guild";
import { ErrorScreen, LoadingScreen } from "../components/StatusScreen";
import { usePresenceLocation } from "../context/PresenceContext";
import type { ApiDataState } from "../hooks/useApiData";
import { useApiData } from "../hooks/useApiData";

export function SettingsPage() {
  usePresenceLocation("settings");
  const configState = useApiData(fetchGuildConfig, []);
  const rolesState = useApiData(fetchGuildRoles, []);
  const channelsState = useApiData(fetchGuildChannels, []);

  if (
    configState.status === "loading" ||
    rolesState.status === "loading" ||
    channelsState.status === "loading"
  ) {
    return <LoadingScreen label="Carregando configuração..." />;
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
    <SettingsForm
      key={configState.data.guildId}
      initialConfig={configState.data}
      roles={rolesState.data}
      channels={channelsState.data}
    />
  );
}

interface FormState {
  recruiterRoleId: string;
  founderRoleId: string;
  memberRoleId: string;
  approvalChannelId: string;
  recruitmentAnnouncementChannelId: string;
  blacklistLogChannelId: string;
  memberVerificationChannelId: string;
  memberExitChannelId: string;
  /** Mantidos como string (input controlado); convertidos para número no patch. */
  recruitmentPoints: string;
  recruitmentCreditWindowHours: string;
}

function toFormState(config: GuildConfig): FormState {
  return {
    recruiterRoleId: config.recruiterRoleId,
    founderRoleId: config.founderRoleId,
    memberRoleId: config.memberRoleId,
    approvalChannelId: config.approvalChannelId ?? "",
    recruitmentAnnouncementChannelId: config.recruitmentAnnouncementChannelId,
    blacklistLogChannelId: config.blacklistLogChannelId,
    memberVerificationChannelId: config.memberVerificationChannelId,
    memberExitChannelId: config.memberExitChannelId,
    recruitmentPoints: String(config.recruitmentPoints),
    recruitmentCreditWindowHours: String(config.recruitmentCreditWindowHours)
  };
}

/** Inteiro >= 1? (mesma regra de `validateGuildConfigUpdate` no servidor.) */
function isValidCount(value: string): boolean {
  const parsed = Number(value);
  return value.trim() !== "" && Number.isInteger(parsed) && parsed >= 1;
}

/** Monta o patch com apenas os campos que mudaram — mantém `config.updated` legível no log. */
function buildPatch(saved: FormState, form: FormState): UpdateGuildConfigRequest {
  const patch: UpdateGuildConfigRequest = {};
  if (form.recruiterRoleId !== saved.recruiterRoleId) patch.recruiterRoleId = form.recruiterRoleId;
  if (form.founderRoleId !== saved.founderRoleId) patch.founderRoleId = form.founderRoleId;
  if (form.memberRoleId !== saved.memberRoleId) patch.memberRoleId = form.memberRoleId;
  if (form.approvalChannelId !== saved.approvalChannelId) {
    patch.approvalChannelId = form.approvalChannelId === "" ? null : form.approvalChannelId;
  }
  if (form.recruitmentAnnouncementChannelId !== saved.recruitmentAnnouncementChannelId) {
    patch.recruitmentAnnouncementChannelId = form.recruitmentAnnouncementChannelId;
  }
  if (form.blacklistLogChannelId !== saved.blacklistLogChannelId) {
    patch.blacklistLogChannelId = form.blacklistLogChannelId;
  }
  if (form.memberVerificationChannelId !== saved.memberVerificationChannelId) {
    patch.memberVerificationChannelId = form.memberVerificationChannelId;
  }
  if (form.memberExitChannelId !== saved.memberExitChannelId) {
    patch.memberExitChannelId = form.memberExitChannelId;
  }
  if (form.recruitmentPoints !== saved.recruitmentPoints && isValidCount(form.recruitmentPoints)) {
    patch.recruitmentPoints = Number(form.recruitmentPoints);
  }
  if (
    form.recruitmentCreditWindowHours !== saved.recruitmentCreditWindowHours &&
    isValidCount(form.recruitmentCreditWindowHours)
  ) {
    patch.recruitmentCreditWindowHours = Number(form.recruitmentCreditWindowHours);
  }
  return patch;
}

type SaveState = "idle" | "saving" | "saved" | "error";

function SettingsForm({
  initialConfig,
  roles,
  channels
}: {
  initialConfig: GuildConfig;
  roles: DiscordRoleSummary[];
  channels: DiscordChannelSummary[];
}) {
  const [saved, setSaved] = useState<FormState>(() => toFormState(initialConfig));
  const [form, setForm] = useState<FormState>(() => toFormState(initialConfig));
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [healthReload, setHealthReload] = useState(0);

  const healthState = useApiData(fetchGuildConfigHealth, [healthReload]);

  const roleOptions = [...roles]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((role) => ({ id: role.id, label: role.name }));
  const channelOptions = [...channels]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((channel) => ({ id: channel.id, label: `#${channel.name}` }));

  const patch = buildPatch(saved, form);
  const isDirty = Object.keys(patch).length > 0;
  const requiredFilled =
    form.recruiterRoleId !== "" &&
    form.founderRoleId !== "" &&
    form.memberRoleId !== "" &&
    form.recruitmentAnnouncementChannelId !== "" &&
    form.blacklistLogChannelId !== "" &&
    form.memberVerificationChannelId !== "" &&
    form.memberExitChannelId !== "";
  const numbersValid =
    isValidCount(form.recruitmentPoints) && isValidCount(form.recruitmentCreditWindowHours);
  const canSave = saveState !== "saving" && isDirty && requiredFilled && numbersValid;

  function set<K extends keyof FormState>(key: K, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSave() {
    if (!canSave) return;
    setSaveState("saving");
    setSaveError(null);
    try {
      const updated = await updateGuildConfig(patch);
      const next = toFormState(updated);
      setSaved(next);
      setForm(next);
      setSaveState("saved");
      setHealthReload((value) => value + 1);
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

  const saveLabel =
    saveState === "saving" ? "Salvando..." : saveState === "saved" ? "Salvo" : "Salvar";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">Configuração</h1>
        <p className="mt-1 font-body text-sm text-ink-muted">
          Cargos, canais e parâmetros de recrutamento que o bot Dragons usa neste servidor. As
          alterações valem para o bot assim que são salvas — ele lê o mesmo Firestore.
        </p>
      </div>

      <section className="rounded-xl border border-line bg-surface p-4 sm:p-6">
        <h2 className="font-display text-lg font-semibold text-ink">Saúde da integração</h2>
        <HealthBlock state={healthState} />
      </section>

      <section className="flex flex-col gap-5 rounded-xl border border-line bg-surface p-4 sm:p-6">
        <h2 className="font-display text-lg font-semibold text-ink">Cargos</h2>

        <SelectField
          label="Recrutador"
          hint="Quem pode usar /recrutar."
          value={form.recruiterRoleId}
          onChange={(value) => set("recruiterRoleId", value)}
          options={roleOptions}
          unknownLabel="Cargo desconhecido"
        />
        <SelectField
          label="Founder"
          hint="Quem aprova recrutamentos — e quem tem acesso a este painel. Cuidado ao trocar."
          value={form.founderRoleId}
          onChange={(value) => set("founderRoleId", value)}
          options={roleOptions}
          unknownLabel="Cargo desconhecido"
        />
        <SelectField
          label="Membro"
          hint="Cargo aplicado ao usuário aprovado."
          value={form.memberRoleId}
          onChange={(value) => set("memberRoleId", value)}
          options={roleOptions}
          unknownLabel="Cargo desconhecido"
        />
      </section>

      <section className="flex flex-col gap-5 rounded-xl border border-line bg-surface p-4 sm:p-6">
        <h2 className="font-display text-lg font-semibold text-ink">Canais</h2>

        <SelectField
          label="Aprovação de recrutamento"
          hint="Opcional. Sem canal, o bot manda a aprovação por DM aos founders."
          value={form.approvalChannelId}
          onChange={(value) => set("approvalChannelId", value)}
          options={channelOptions}
          unknownLabel="Canal desconhecido"
          emptyOption="— Nenhum (aprovação por DM) —"
        />
        <SelectField
          label="Anúncio de recrutamento"
          hint="Recebe o anúncio quando um recrutamento é aprovado."
          value={form.recruitmentAnnouncementChannelId}
          onChange={(value) => set("recruitmentAnnouncementChannelId", value)}
          options={channelOptions}
          unknownLabel="Canal desconhecido"
        />
        <SelectField
          label="Log de blacklist"
          hint="Recebe adições e remoções da blacklist."
          value={form.blacklistLogChannelId}
          onChange={(value) => set("blacklistLogChannelId", value)}
          options={channelOptions}
          unknownLabel="Canal desconhecido"
        />
        <SelectField
          label="Fila de verificação"
          hint="Recebe o card de cada novo membro aguardando verificação."
          value={form.memberVerificationChannelId}
          onChange={(value) => set("memberVerificationChannelId", value)}
          options={channelOptions}
          unknownLabel="Canal desconhecido"
        />
        <SelectField
          label="Saída de membro"
          hint="Recebe o card quando um membro sai do servidor."
          value={form.memberExitChannelId}
          onChange={(value) => set("memberExitChannelId", value)}
          options={channelOptions}
          unknownLabel="Canal desconhecido"
        />
      </section>

      <section className="flex flex-col gap-5 rounded-xl border border-line bg-surface p-4 sm:p-6">
        <h2 className="font-display text-lg font-semibold text-ink">Parâmetros de recrutamento</h2>

        <NumberField
          label="Pontos por recrutamento"
          hint="Pontos creditados ao recrutador quando um recrutamento é aprovado."
          value={form.recruitmentPoints}
          onChange={(value) => set("recruitmentPoints", value)}
        />
        <NumberField
          label="Janela de crédito (horas)"
          hint="Prazo após a entrada em que ainda cabe pedir crédito de recrutamento."
          value={form.recruitmentCreditWindowHours}
          onChange={(value) => set("recruitmentCreditWindowHours", value)}
        />
      </section>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={!canSave}
            className="w-fit rounded-lg bg-ember px-5 py-2.5 font-display text-sm font-semibold text-on-accent transition-colors hover:bg-ember/85 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saveLabel}
          </button>
          {isDirty && saveState !== "saving" ? (
            <span className="font-body text-xs text-warn">Alterações não salvas</span>
          ) : null}
          {isDirty && !requiredFilled ? (
            <span className="font-body text-xs text-danger">
              Todos os cargos e canais obrigatórios precisam estar preenchidos.
            </span>
          ) : null}
          {isDirty && requiredFilled && !numbersValid ? (
            <span className="font-body text-xs text-danger">
              Os parâmetros precisam ser números inteiros maiores ou iguais a 1.
            </span>
          ) : null}
        </div>
        {saveError ? (
          <p role="alert" className="font-body text-sm text-danger">
            {saveError}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function SelectField({
  label,
  hint,
  value,
  onChange,
  options,
  unknownLabel,
  emptyOption
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ id: string; label: string }>;
  unknownLabel: string;
  emptyOption?: string;
}) {
  const known = options.some((option) => option.id === value);
  return (
    <div className="flex flex-col gap-1">
      <label className="font-body text-xs font-medium text-ink-muted">{label}</label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-lg border border-line bg-ground px-3 py-2 font-body text-sm text-ink outline-none focus-visible:border-ember"
      >
        {emptyOption ? <option value="">{emptyOption}</option> : null}
        {!known && value ? (
          <option value={value}>
            {unknownLabel} ({value})
          </option>
        ) : null}
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
      {hint ? <p className="font-body text-xs text-ink-muted">{hint}</p> : null}
    </div>
  );
}

function NumberField({
  label,
  hint,
  value,
  onChange
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const invalid = value.trim() !== "" && !isValidCount(value);
  return (
    <div className="flex flex-col gap-1">
      <label className="font-body text-xs font-medium text-ink-muted">{label}</label>
      <input
        type="number"
        inputMode="numeric"
        min={1}
        step={1}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-32 rounded-lg border border-line bg-ground px-3 py-2 font-body text-sm text-ink outline-none focus-visible:border-ember"
      />
      {invalid ? (
        <p className="font-body text-xs text-danger">Use um número inteiro maior ou igual a 1.</p>
      ) : hint ? (
        <p className="font-body text-xs text-ink-muted">{hint}</p>
      ) : null}
    </div>
  );
}

const DOT_CLASS: Record<GuildConfigHealthLevel, string> = {
  ok: "bg-ok",
  warning: "bg-warn",
  error: "bg-danger"
};

const WORST_LABEL: Record<GuildConfigHealthLevel, string> = {
  ok: "Tudo certo",
  warning: "Atenção",
  error: "Problemas na configuração"
};

function HealthBlock({
  state
}: {
  state: ApiDataState<{ checks: GuildConfigHealthCheck[]; worst: GuildConfigHealthLevel }>;
}) {
  if (state.status === "loading") {
    return (
      <p className="mt-3 font-body text-sm text-ink-muted">
        Verificando integração com o Discord...
      </p>
    );
  }
  if (state.status === "error") {
    return (
      <p className="mt-3 font-body text-sm text-danger">
        Não foi possível verificar: {state.message}
      </p>
    );
  }

  const { checks, worst } = state.data;
  return (
    <>
      <p className="mt-1 flex items-center gap-2 font-body text-sm text-ink">
        <span
          aria-hidden="true"
          className={`h-2.5 w-2.5 shrink-0 rounded-full ${DOT_CLASS[worst]}`}
        />
        {WORST_LABEL[worst]}
      </p>
      <ul className="mt-3 flex flex-col divide-y divide-line">
        {checks.map((check) => (
          <li key={check.id} className="flex items-start gap-3 py-3">
            <span
              aria-hidden="true"
              className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${DOT_CLASS[check.level]}`}
            />
            <div className="flex flex-col">
              <span className="font-body text-sm text-ink">{check.label}</span>
              <span className="font-body text-xs text-ink-muted">{check.detail}</span>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
