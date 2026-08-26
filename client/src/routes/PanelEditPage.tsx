import type { PanelButtonInput, PanelConfig, UpdatePanelRequest } from "@dragons/shared";
import {
  PANEL_LIMITS,
  validateButtons,
  validateDescription,
  validateImageUrl,
  validateTitle
} from "@dragons/shared";
import type { MouseEvent } from "react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { ApiError } from "../api/client";
import { deletePanel, fetchPanel, publishPanel, updatePanel } from "../api/panels";
import { BackIcon } from "../components/icons";
import { ErrorScreen, LoadingScreen } from "../components/StatusScreen";
import { DiscordPanelPreview } from "../discord-preview/DiscordPanelPreview";
import { useApiData } from "../hooks/useApiData";
import { ButtonEditorList } from "../panel-editor/ButtonEditorList";
import { CharacterCounter } from "../panel-editor/CharacterCounter";
import { ConfirmDialog } from "../panel-editor/ConfirmDialog";
import { ImageUrlField } from "../panel-editor/ImageUrlField";
import { PublishPanelSection } from "../panel-editor/PublishPanelSection";
import type { LocalButton } from "../panel-editor/types";
import { useUnsavedChangesWarning } from "../panel-editor/useUnsavedChangesWarning";
import { usePublishStatusPolling } from "../panel-editor/usePublishStatusPolling";

export function PanelEditPage() {
  const { id } = useParams<{ id: string }>();
  const state = useApiData(
    (signal) => {
      if (!id) return Promise.reject(new Error("Id do painel ausente na URL."));
      return fetchPanel(id, signal);
    },
    [id]
  );

  if (state.status === "loading") {
    return <LoadingScreen label="Carregando painel..." />;
  }

  if (state.status === "error") {
    return <ErrorScreen title="Não foi possível carregar o painel" message={state.message} />;
  }

  // `key` forca remontar o formulario (e resetar todo o estado local nao
  // salvo) se o usuario navegar diretamente entre dois paineis diferentes.
  return <PanelEditorForm key={state.data.id} initialPanel={state.data} />;
}

interface FormState {
  title: string;
  description: string;
  imageUrl: string;
  buttons: LocalButton[];
}

function toFormState(panel: PanelConfig): FormState {
  return {
    title: panel.title,
    description: panel.description,
    imageUrl: panel.imageUrl ?? "",
    buttons: [...panel.buttons]
      .sort((a, b) => a.order - b.order)
      .map((button) => ({
        key: button.id,
        id: button.id,
        label: button.label,
        emoji: button.emoji,
        style: button.style,
        response: button.response
      }))
  };
}

function toButtonsInput(buttons: LocalButton[]): PanelButtonInput[] {
  return buttons.map((button) => ({
    id: button.id,
    label: button.label,
    emoji: button.emoji,
    style: button.style,
    response: button.response
  }));
}

type SaveState = "idle" | "saving" | "saved" | "error";

function PanelEditorForm({ initialPanel }: { initialPanel: PanelConfig }) {
  const navigate = useNavigate();

  const [saved, setSaved] = useState(initialPanel);
  const [form, setForm] = useState<FormState>(() => toFormState(initialPanel));
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteState, setDeleteState] = useState<"idle" | "deleting" | "error">("idle");
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const polling = usePublishStatusPolling(initialPanel.id);
  const [pollingContext, setPollingContext] = useState<"publish" | "sync">("sync");
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncNowError, setSyncNowError] = useState<string | null>(null);

  const savedForm = toFormState(saved);
  const isDirty = JSON.stringify(form) !== JSON.stringify(savedForm);
  useUnsavedChangesWarning(isDirty);

  const titleError = form.title.length > 0 ? validateTitle(form.title) : "Obrigatório.";
  const descriptionError =
    form.description.length > 0 ? validateDescription(form.description) : "Obrigatório.";
  const imageUrl = form.imageUrl.trim();
  const imageUrlError = imageUrl.length > 0 ? validateImageUrl(imageUrl) : null;
  const buttonsInput = toButtonsInput(form.buttons);
  const buttonsError = validateButtons(buttonsInput);

  const canSave =
    saveState !== "saving" && !titleError && !descriptionError && !imageUrlError && !buttonsError;

  // Depois que um job de publicacao/sincronizacao chega em `completed`,
  // `publishedChannelId`/`publishedMessageId` do painel podem ter mudado no
  // Firestore (primeira publicacao) — busca o painel de novo para refletir
  // isso na UI. Campos do formulario (title/description/etc.) nao sao
  // tocados, entao nao ha risco de sobrescrever edicoes locais nao salvas.
  async function refreshPublishedFields() {
    try {
      const fresh = await fetchPanel(saved.id);
      setSaved(fresh);
    } catch {
      // Feedback de sincronizacao ja apareceu via polling; falha aqui so
      // significa que o badge de "publicado em #canal" fica desatualizado
      // ate a proxima visita a pagina — nao vale interromper o usuario.
    }
  }

  async function handleSave() {
    if (!canSave) return;

    setSaveState("saving");
    setSaveError(null);
    try {
      const body: UpdatePanelRequest = {
        title: form.title,
        description: form.description,
        imageUrl: imageUrl.length > 0 ? imageUrl : null,
        buttons: buttonsInput
      };
      const { panel: updated, syncQueued } = await updatePanel(saved.id, body);
      setSaved(updated);
      setForm(toFormState(updated));
      setSaveState("saved");
      window.setTimeout(
        () => setSaveState((current) => (current === "saved" ? "idle" : current)),
        2500
      );
      if (syncQueued) {
        setPollingContext("sync");
        polling.start(() => void refreshPublishedFields());
      }
    } catch (error) {
      setSaveState("error");
      setSaveError(error instanceof ApiError ? error.message : "Não foi possível salvar o painel.");
    }
  }

  async function handlePublish(channelId: string) {
    if (!channelId || publishing) return;
    setPublishing(true);
    setPublishError(null);
    try {
      await publishPanel(saved.id, { channelId });
      setPollingContext("publish");
      polling.start(() => void refreshPublishedFields());
    } catch (error) {
      setPublishError(
        error instanceof ApiError ? error.message : "Não foi possível publicar o painel."
      );
    } finally {
      setPublishing(false);
    }
  }

  async function handleSyncNow() {
    if (syncing) return;
    setSyncing(true);
    setSyncNowError(null);
    try {
      const { panel: updated, syncQueued } = await updatePanel(saved.id, {});
      setSaved(updated);
      if (syncQueued) {
        setPollingContext("sync");
        polling.start(() => void refreshPublishedFields());
      }
    } catch (error) {
      setSyncNowError(
        error instanceof ApiError ? error.message : "Não foi possível sincronizar o painel."
      );
    } finally {
      setSyncing(false);
    }
  }

  async function handleDelete() {
    setDeleteState("deleting");
    setDeleteError(null);
    try {
      await deletePanel(saved.id);
      navigate("/paineis", { replace: true });
    } catch (error) {
      setDeleteState("error");
      setConfirmDelete(false);
      setDeleteError(
        error instanceof ApiError ? error.message : "Não foi possível excluir o painel."
      );
    }
  }

  function handleBackClick(event: MouseEvent) {
    if (isDirty && !window.confirm("Você tem alterações não salvas. Sair mesmo assim?")) {
      event.preventDefault();
    }
  }

  const previewPanel: PanelConfig = {
    ...saved,
    title: form.title,
    description: form.description,
    imageUrl: imageUrl.length > 0 ? imageUrl : null,
    buttons: form.buttons.map((button, index) => ({
      id: button.id ?? button.key,
      label: button.label,
      emoji: button.emoji,
      style: button.style,
      response: button.response,
      order: index
    }))
  };

  const saveLabel =
    saveState === "saving" ? "Salvando..." : saveState === "saved" ? "Salvo" : "Salvar";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <Link
          to="/paineis"
          onClick={handleBackClick}
          className="flex w-fit items-center gap-2 font-display text-sm font-medium text-ink-muted transition-colors hover:text-ink"
        >
          <BackIcon className="h-4 w-4" />
          Voltar para painéis
        </Link>

        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          className="rounded-lg border border-danger/50 px-3 py-1.5 font-display text-sm font-medium text-danger transition-colors hover:bg-danger/10"
        >
          Excluir painel
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
        <div className="flex flex-col gap-6 rounded-xl border border-line bg-surface p-6">
          <div>
            <span className="font-mono text-xs text-ink-muted">{saved.id}</span>
            <h1 className="mt-1 font-display text-2xl font-bold text-ink">Editar painel</h1>
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <label htmlFor="panel-title" className="font-body text-xs font-medium text-ink-muted">
                Título
              </label>
              <CharacterCounter current={form.title.length} max={PANEL_LIMITS.TITLE_MAX} />
            </div>
            <input
              id="panel-title"
              type="text"
              value={form.title}
              onChange={(event) =>
                setForm((current) => ({ ...current, title: event.target.value }))
              }
              className="rounded-lg border border-line bg-ground px-3 py-2 font-body text-sm text-ink outline-none focus-visible:border-ember"
            />
            {form.title.length > 0 && titleError ? (
              <p className="font-body text-xs text-danger">{titleError}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <label
                htmlFor="panel-description"
                className="font-body text-xs font-medium text-ink-muted"
              >
                Descrição
              </label>
              <CharacterCounter
                current={form.description.length}
                max={PANEL_LIMITS.DESCRIPTION_MAX}
              />
            </div>
            <textarea
              id="panel-description"
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({ ...current, description: event.target.value }))
              }
              rows={6}
              className="resize-y rounded-lg border border-line bg-ground px-3 py-2 font-body text-sm text-ink outline-none focus-visible:border-ember"
            />
            {form.description.length > 0 && descriptionError ? (
              <p className="font-body text-xs text-danger">{descriptionError}</p>
            ) : null}
          </div>

          <ImageUrlField
            value={form.imageUrl}
            onChange={(next) => setForm((current) => ({ ...current, imageUrl: next }))}
            error={imageUrl.length > 0 ? imageUrlError : null}
          />

          <div className="border-t border-line pt-5">
            <ButtonEditorList
              buttons={form.buttons}
              onChange={(next) => setForm((current) => ({ ...current, buttons: next }))}
            />
            {buttonsError ? (
              <p role="alert" className="mt-2 font-body text-xs text-danger">
                {buttonsError}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2 border-t border-line pt-5">
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
              {!isDirty && pollingContext === "sync" && polling.state.phase === "polling" ? (
                <span className="font-body text-xs text-ink-muted">
                  Salvo. Atualizando no Discord...
                </span>
              ) : null}
            </div>
            {saveError ? (
              <p role="alert" className="font-body text-sm text-danger">
                {saveError}
              </p>
            ) : null}
          </div>

          <div className="border-t border-line pt-5">
            <PublishPanelSection
              panel={saved}
              pollingState={polling.state}
              pollingContext={pollingContext}
              publishing={publishing}
              publishError={publishError}
              onPublish={(channelId) => void handlePublish(channelId)}
              syncing={syncing}
              onSyncNow={() => void handleSyncNow()}
            />
            {syncNowError ? (
              <p role="alert" className="mt-2 font-body text-sm text-danger">
                {syncNowError}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="font-display text-sm font-semibold text-ink-muted">
            Pré-visualização (como aparece no Discord)
          </h2>
          <DiscordPanelPreview panel={previewPanel} />
          {saved.publishedChannelId ? (
            <p className="font-body text-xs text-ink-muted">
              Salvar altera a mensagem publicada no Discord automaticamente.
            </p>
          ) : (
            <p className="font-body text-xs text-ink-muted">
              Isto ainda é só uma prévia — publique na seção acima para postar no Discord.
            </p>
          )}
        </div>
      </div>

      {confirmDelete ? (
        <ConfirmDialog
          title="Excluir painel"
          description={`Excluir o painel "${saved.title}" (id: ${saved.id})? Essa ação não pode ser desfeita — se ele já foi publicado no Discord, os botões da mensagem publicada param de responder.`}
          confirmLabel={deleteState === "deleting" ? "Excluindo..." : "Excluir"}
          destructive
          onConfirm={() => void handleDelete()}
          onCancel={() => setConfirmDelete(false)}
        />
      ) : null}

      {deleteError ? (
        <p role="alert" className="font-body text-sm text-danger">
          {deleteError}
        </p>
      ) : null}
    </div>
  );
}
