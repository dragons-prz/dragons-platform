import type { PanelConfig, SupportCategoryConfig, UpdatePanelRequest } from "@dragons/shared";
import { formatPanelLocation, validateBlocks, validateColor } from "@dragons/shared";
import type { MouseEvent } from "react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { ApiError } from "../api/client";
import { deletePanel, fetchPanel, publishPanel, updatePanel } from "../api/panels";
import { fetchSupportCategories } from "../api/support-categories";
import { BackIcon } from "../components/icons";
import { PanelCoEditors } from "../components/PresenceBar";
import { ErrorScreen, LoadingScreen } from "../components/StatusScreen";
import { DiscordPanelPreview } from "../discord-preview/DiscordPanelPreview";
import { usePresenceLocation } from "../context/PresenceContext";
import { useApiData } from "../hooks/useApiData";
import { BlockListEditor } from "../panel-editor/BlockListEditor";
import { toBlockInputs, toLocalBlocks, toPreviewBlocks } from "../panel-editor/blocks";
import type { LocalBlock } from "../panel-editor/blocks";
import { ColorField } from "../panel-editor/ColorField";
import { ConfirmDialog } from "../panel-editor/ConfirmDialog";
import { PublishPanelSection } from "../panel-editor/PublishPanelSection";
import { useUnsavedChangesWarning } from "../panel-editor/useUnsavedChangesWarning";
import { usePublishStatusPolling } from "../panel-editor/usePublishStatusPolling";

export function PanelEditPage() {
  const { id } = useParams<{ id: string }>();
  usePresenceLocation(id ? formatPanelLocation(id) : "panels");
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

  return <PanelEditGate key={state.data.id} initialPanel={state.data} />;
}

function PanelEditGate({ initialPanel }: { initialPanel: PanelConfig }) {
  const categoriesState = useApiData(fetchSupportCategories, []);
  const categories = categoriesState.status === "ready" ? categoriesState.data : [];
  return (
    <>
      <PanelCoEditors panelId={initialPanel.id} />
      <PanelEditorForm initialPanel={initialPanel} categories={categories} />
    </>
  );
}

interface FormState {
  color: string;
  blocks: LocalBlock[];
}

function toFormState(panel: PanelConfig): FormState {
  return { color: panel.color ?? "", blocks: toLocalBlocks(panel) };
}

type SaveState = "idle" | "saving" | "saved" | "error";

function PanelEditorForm({
  initialPanel,
  categories
}: {
  initialPanel: PanelConfig;
  categories: SupportCategoryConfig[];
}) {
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

  const isDirty = JSON.stringify(form) !== JSON.stringify(toFormState(saved));
  useUnsavedChangesWarning(isDirty);

  const color = form.color.trim();
  const colorError = color.length > 0 ? validateColor(color) : null;
  const blockInputs = toBlockInputs(form.blocks);
  const blocksError = validateBlocks(blockInputs);

  const canSave = saveState !== "saving" && !colorError && !blocksError;

  async function refreshPublishedFields() {
    try {
      const fresh = await fetchPanel(saved.id);
      setSaved(fresh);
    } catch {
      // Feedback de sincronizacao ja veio via polling; nao vale interromper.
    }
  }

  async function handleSave() {
    if (!canSave) return;
    setSaveState("saving");
    setSaveError(null);
    try {
      const body: UpdatePanelRequest = {
        color: color.length > 0 ? color : null,
        blocks: blockInputs
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
    color: color.length > 0 ? color : null,
    blocks: toPreviewBlocks(form.blocks)
  };

  const saveLabel =
    saveState === "saving" ? "Salvando..." : saveState === "saved" ? "Salvo" : "Salvar";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,34rem)]">
        <div className="flex flex-col gap-6 rounded-xl border border-line bg-surface p-4 sm:p-6">
          <div>
            <span className="font-mono text-xs text-ink-muted">{saved.id}</span>
            <h1 className="mt-1 font-display text-2xl font-bold text-ink">Editar painel</h1>
            <p className="mt-1 font-body text-sm text-ink-muted">
              O painel é uma lista de blocos renderizada como Container (Components V2). Arraste
              para reordenar — botão no meio, banner no rodapé, o que você quiser.
            </p>
          </div>

          <ColorField
            label="Cor lateral do painel (opcional)"
            value={form.color}
            onChange={(next) => setForm((current) => ({ ...current, color: next }))}
            error={color.length > 0 ? colorError : null}
          />

          <BlockListEditor
            blocks={form.blocks}
            categories={categories}
            onChange={(blocks) => setForm((current) => ({ ...current, blocks }))}
          />

          {blocksError ? (
            <p role="alert" className="font-body text-xs text-danger">
              {blocksError}
            </p>
          ) : null}

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

        <div className="sticky top-0 z-20 order-first flex flex-col gap-2 bg-ground pb-2 lg:order-none lg:top-6 lg:z-auto lg:h-fit lg:bg-transparent lg:pb-0">
          <h2 className="font-display text-sm font-semibold text-ink-muted">
            Pré-visualização (como aparece no Discord)
          </h2>
          <div className="max-h-[42vh] overflow-y-auto rounded-lg lg:max-h-none lg:overflow-visible">
            <DiscordPanelPreview panel={previewPanel} />
          </div>
          {saved.publishedChannelId ? (
            <p className="hidden font-body text-xs text-ink-muted lg:block">
              Salvar altera a mensagem publicada no Discord automaticamente.
            </p>
          ) : (
            <p className="hidden font-body text-xs text-ink-muted lg:block">
              Isto ainda é só uma prévia — publique na seção acima para postar no Discord.
            </p>
          )}
        </div>
      </div>

      {confirmDelete ? (
        <ConfirmDialog
          title="Excluir painel"
          description={`Excluir o painel "${saved.id}"? Essa ação não pode ser desfeita — se ele já foi publicado no Discord, os botões da mensagem publicada param de responder.`}
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
