import type {
  DiscordChannelSummary,
  DiscordRoleSummary,
  SupportCategoryConfig,
  UpdateSupportCategoryRequest
} from "@dragons/shared";
import { SUPPORT_CATEGORY_LIMITS, validateSupportCategoryUpdate } from "@dragons/shared";
import type { ReactNode } from "react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { ApiError } from "../api/client";
import { fetchGuildChannels, fetchGuildRoles } from "../api/guild";
import {
  deleteSupportCategory,
  fetchSupportCategory,
  updateSupportCategory
} from "../api/support-categories";
import { BackIcon } from "../components/icons";
import { ErrorScreen, LoadingScreen } from "../components/StatusScreen";
import { CharacterCounter } from "../panel-editor/CharacterCounter";
import { ConfirmDialog } from "../panel-editor/ConfirmDialog";
import { useApiData } from "../hooks/useApiData";

export function SupportCategoryEditPage() {
  const { id } = useParams<{ id: string }>();
  const categoryState = useApiData(
    (signal) => {
      if (!id) return Promise.reject(new Error("Id da categoria ausente na URL."));
      return fetchSupportCategory(id, signal);
    },
    [id]
  );
  const rolesState = useApiData(fetchGuildRoles, []);
  const channelsState = useApiData(fetchGuildChannels, []);

  if (
    categoryState.status === "loading" ||
    rolesState.status === "loading" ||
    channelsState.status === "loading"
  ) {
    return <LoadingScreen label="Carregando categoria..." />;
  }
  if (categoryState.status === "error") {
    return (
      <ErrorScreen title="Não foi possível carregar a categoria" message={categoryState.message} />
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
    <CategoryForm
      key={categoryState.data.id}
      initial={categoryState.data}
      roles={rolesState.data}
      channels={channelsState.data}
    />
  );
}

interface FormState {
  name: string;
  parentChannelId: string;
  supportRoleIds: string[];
  viewerRoleIds: string[];
  threadNameTemplate: string;
  openMessage: string;
  claimMessage: string;
  closeMessage: string;
}

function toFormState(category: SupportCategoryConfig): FormState {
  return {
    name: category.name,
    parentChannelId: category.parentChannelId,
    supportRoleIds: category.supportRoleIds,
    viewerRoleIds: category.viewerRoleIds,
    threadNameTemplate: category.threadNameTemplate,
    openMessage: category.openMessage,
    claimMessage: category.claimMessage,
    closeMessage: category.closeMessage
  };
}

function CategoryForm({
  initial,
  roles,
  channels
}: {
  initial: SupportCategoryConfig;
  roles: DiscordRoleSummary[];
  channels: DiscordChannelSummary[];
}) {
  const navigate = useNavigate();
  const [saved, setSaved] = useState(initial);
  const [form, setForm] = useState<FormState>(() => toFormState(initial));
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const isDirty = JSON.stringify(form) !== JSON.stringify(toFormState(saved));

  const patch = buildPatch(form);
  const shapeError = Object.keys(patch).length > 0 ? validateSupportCategoryUpdate(patch) : null;
  const canSave = saveState !== "saving" && isDirty && !shapeError;

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function toggleRole(list: "supportRoleIds" | "viewerRoleIds", roleId: string) {
    setForm((current) => {
      const set = new Set(current[list]);
      if (set.has(roleId)) set.delete(roleId);
      else set.add(roleId);
      return { ...current, [list]: [...set] };
    });
  }

  async function handleSave() {
    if (!canSave) return;
    setSaveState("saving");
    setSaveError(null);
    try {
      const updated = await updateSupportCategory(saved.id, patch);
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
        error instanceof ApiError ? error.message : "Não foi possível salvar a categoria."
      );
    }
  }

  async function handleDelete() {
    try {
      await deleteSupportCategory(saved.id);
      navigate("/suporte", { replace: true });
    } catch (error) {
      setConfirmDelete(false);
      setDeleteError(
        error instanceof ApiError ? error.message : "Não foi possível excluir a categoria."
      );
    }
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/suporte"
          className="flex w-fit items-center gap-2 font-display text-sm font-medium text-ink-muted transition-colors hover:text-ink"
        >
          <BackIcon className="h-4 w-4" />
          Voltar para suporte
        </Link>
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          className="rounded-lg border border-danger/50 px-3 py-1.5 font-display text-sm font-medium text-danger transition-colors hover:bg-danger/10"
        >
          Excluir categoria
        </button>
      </div>

      <div className="flex flex-col gap-5 rounded-xl border border-line bg-surface p-4 sm:p-6">
        <div>
          <span className="font-mono text-xs text-ink-muted">{saved.id}</span>
          <h1 className="mt-1 font-display text-2xl font-bold text-ink">Editar categoria</h1>
        </div>

        <Field label="Nome">
          <input
            type="text"
            value={form.name}
            onChange={(event) => update("name", event.target.value)}
            className="rounded-lg border border-line bg-ground px-3 py-2 font-body text-sm text-ink outline-none focus-visible:border-ember"
          />
        </Field>

        <Field label="Canal-pai (onde o tópico privado nasce)">
          <select
            value={form.parentChannelId}
            onChange={(event) => update("parentChannelId", event.target.value)}
            className="rounded-lg border border-line bg-ground px-3 py-2 font-body text-sm text-ink outline-none focus-visible:border-ember"
          >
            {channels.map((channel) => (
              <option key={channel.id} value={channel.id}>
                #{channel.name}
              </option>
            ))}
          </select>
        </Field>

        <RolePicker
          label="Cargos de suporte (atendem e fecham o ticket)"
          roles={roles}
          selected={form.supportRoleIds}
          onToggle={(roleId) => toggleRole("supportRoleIds", roleId)}
        />

        <RolePicker
          label="Cargos que só visualizam (marcados no tópico, sem poder de ação)"
          roles={roles}
          selected={form.viewerRoleIds}
          onToggle={(roleId) => toggleRole("viewerRoleIds", roleId)}
        />

        <Field label="Nome do tópico — {user} (obrigatório), {date} (AAAAMMDD), {shortid}. Sem {date}/{shortid} o nome se repete a cada ticket da mesma pessoa.">
          <input
            type="text"
            value={form.threadNameTemplate}
            maxLength={SUPPORT_CATEGORY_LIMITS.THREAD_NAME_TEMPLATE_MAX}
            onChange={(event) => update("threadNameTemplate", event.target.value)}
            className="rounded-lg border border-line bg-ground px-3 py-2 font-mono text-sm text-ink outline-none focus-visible:border-ember"
          />
        </Field>

        <MessageField
          label="Mensagem de abertura (aceita {user})"
          value={form.openMessage}
          onChange={(value) => update("openMessage", value)}
        />
        <MessageField
          label="Mensagem ao atender (aceita {user} e {claimer})"
          value={form.claimMessage}
          onChange={(value) => update("claimMessage", value)}
        />
        <MessageField
          label="Mensagem ao fechar (aceita {user} e {closer})"
          value={form.closeMessage}
          onChange={(value) => update("closeMessage", value)}
        />

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

      {deleteError ? (
        <p role="alert" className="font-body text-sm text-danger">
          {deleteError}
        </p>
      ) : null}

      {confirmDelete ? (
        <ConfirmDialog
          title="Excluir categoria"
          description={`Excluir a categoria "${saved.name}" (id: ${saved.id})? Painéis que referenciam essa categoria vão parar de abrir tickets.`}
          confirmLabel="Excluir"
          destructive
          onConfirm={() => void handleDelete()}
          onCancel={() => setConfirmDelete(false)}
        />
      ) : null}
    </div>
  );
}

function buildPatch(form: FormState): UpdateSupportCategoryRequest {
  return {
    name: form.name,
    parentChannelId: form.parentChannelId,
    supportRoleIds: form.supportRoleIds,
    viewerRoleIds: form.viewerRoleIds,
    threadNameTemplate: form.threadNameTemplate,
    openMessage: form.openMessage,
    claimMessage: form.claimMessage,
    closeMessage: form.closeMessage
  };
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="font-body text-xs font-medium text-ink-muted">{label}</span>
      {children}
    </label>
  );
}

function MessageField({
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
      <span className="flex items-center justify-between font-body text-xs font-medium text-ink-muted">
        {label}
        <CharacterCounter current={value.length} max={SUPPORT_CATEGORY_LIMITS.MESSAGE_MAX} />
      </span>
      <textarea
        value={value}
        rows={3}
        onChange={(event) => onChange(event.target.value)}
        className="resize-y rounded-lg border border-line bg-ground px-3 py-2 font-body text-sm text-ink outline-none focus-visible:border-ember"
      />
    </label>
  );
}

function RolePicker({
  label,
  roles,
  selected,
  onToggle
}: {
  label: string;
  roles: DiscordRoleSummary[];
  selected: string[];
  onToggle: (roleId: string) => void;
}) {
  const selectedSet = new Set(selected);
  return (
    <div className="flex flex-col gap-1">
      <span className="font-body text-xs font-medium text-ink-muted">{label}</span>
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
    </div>
  );
}
