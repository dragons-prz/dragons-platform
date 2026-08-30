import type {
  PanelButtonInput,
  PanelConfig,
  PanelKind,
  PanelLayout,
  PanelSelectInput,
  SupportCategoryConfig,
  UpdatePanelRequest
} from "@dragons/shared";
import {
  formatPanelLocation,
  PANEL_LIMITS,
  validateButtons,
  validateColor,
  validateDescription,
  validateImageUrl,
  validatePanelLayout,
  validateSelect,
  validateTitle
} from "@dragons/shared";
import type { MouseEvent, ReactNode } from "react";
import { useRef, useState } from "react";
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
import { ButtonEditorList } from "../panel-editor/ButtonEditorList";
import { CharacterCounter } from "../panel-editor/CharacterCounter";
import { EmojiPicker } from "../panel-editor/EmojiPicker";
import { useCursorInsert } from "../panel-editor/useCursorInsert";
import { ColorField } from "../panel-editor/ColorField";
import { ConfirmDialog } from "../panel-editor/ConfirmDialog";
import { ImageUrlField } from "../panel-editor/ImageUrlField";
import { PublishPanelSection } from "../panel-editor/PublishPanelSection";
import { SelectOptionEditorList } from "../panel-editor/SelectOptionEditorList";
import { createLocalButtonId } from "../panel-editor/types";
import type { LocalButton, LocalSelectOption } from "../panel-editor/types";
import { useUnsavedChangesWarning } from "../panel-editor/useUnsavedChangesWarning";
import { usePublishStatusPolling } from "../panel-editor/usePublishStatusPolling";

const DEFAULT_PLACEHOLDER = "Selecione uma opção!";

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

  // `key` forca remontar o formulario (e resetar todo o estado local nao
  // salvo) se o usuario navegar diretamente entre dois paineis diferentes.
  return <PanelEditGate key={state.data.id} initialPanel={state.data} />;
}

/** Carrega as categorias de suporte (para o editor de acao) antes do formulario. */
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
  title: string;
  description: string;
  imageUrl: string;
  color: string;
  kind: PanelKind;
  layout: PanelLayout;
  buttons: LocalButton[];
  placeholder: string;
  selectOptions: LocalSelectOption[];
}

function toFormState(panel: PanelConfig): FormState {
  return {
    title: panel.title,
    description: panel.description,
    imageUrl: panel.imageUrl ?? "",
    color: panel.color ?? "",
    kind: panel.kind ?? "buttons",
    layout: panel.layout ?? "embed",
    buttons: [...panel.buttons]
      .sort((a, b) => a.order - b.order)
      .map((button) => ({
        key: button.id,
        id: button.id,
        label: button.label,
        emoji: button.emoji,
        style: button.style,
        response: button.response,
        responseImageUrl: button.responseImageUrl,
        responseColor: button.responseColor,
        action: button.action
      })),
    placeholder: panel.select?.placeholder ?? DEFAULT_PLACEHOLDER,
    selectOptions: [...(panel.select?.options ?? [])]
      .sort((a, b) => a.order - b.order)
      .map((option) => ({
        key: option.id,
        id: option.id,
        label: option.label,
        description: option.description,
        emoji: option.emoji,
        action: option.action
      }))
  };
}

function toButtonsInput(buttons: LocalButton[]): PanelButtonInput[] {
  return buttons.map((button) => ({
    id: button.id,
    label: button.label,
    emoji: button.emoji,
    style: button.style,
    response: button.response,
    responseImageUrl: button.responseImageUrl,
    responseColor: button.responseColor,
    action: button.action
  }));
}

function toSelectInput(form: FormState): PanelSelectInput {
  return {
    placeholder: form.placeholder,
    options: form.selectOptions.map((option) => ({
      id: option.id,
      label: option.label,
      description: option.description,
      emoji: option.emoji,
      action: option.action
    }))
  };
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
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const insertIntoDescription = useCursorInsert(descriptionRef, form.description, (next) =>
    setForm((current) => ({ ...current, description: next }))
  );
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
  const color = form.color.trim();
  const colorError = color.length > 0 ? validateColor(color) : null;
  const buttonsInput = toButtonsInput(form.buttons);
  const selectInput = toSelectInput(form);
  // `text` valida a FORMA dos botoes que existirem, mas nao exige nenhum.
  const buttonsError = form.kind === "select" ? null : validateButtons(buttonsInput);
  const selectError = form.kind === "select" ? validateSelect(selectInput) : null;
  const layoutError = validatePanelLayout(form.layout, {
    title: form.title,
    description: form.description
  });

  const canSave =
    saveState !== "saving" &&
    !titleError &&
    !descriptionError &&
    !imageUrlError &&
    !colorError &&
    !buttonsError &&
    !selectError &&
    !layoutError;

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
        color: color.length > 0 ? color : null,
        kind: form.kind,
        layout: form.layout,
        buttons: buttonsInput,
        select: form.kind === "select" ? selectInput : null
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
    color: color.length > 0 ? color : null,
    kind: form.kind,
    layout: form.layout,
    buttons: form.buttons.map((button, index) => ({
      id: button.id ?? button.key,
      label: button.label,
      emoji: button.emoji,
      style: button.style,
      response: button.response,
      responseImageUrl: button.responseImageUrl,
      responseColor: button.responseColor,
      action: button.action,
      order: index
    })),
    select:
      form.kind === "select"
        ? {
            placeholder: form.placeholder,
            options: form.selectOptions.map((option, index) => ({
              id: option.id ?? option.key,
              label: option.label,
              description: option.description,
              emoji: option.emoji,
              action: option.action,
              order: index
            }))
          }
        : null
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
            <div className="flex items-start gap-2">
              <textarea
                id="panel-description"
                ref={descriptionRef}
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({ ...current, description: event.target.value }))
                }
                rows={6}
                className="flex-1 resize-y rounded-lg border border-line bg-ground px-3 py-2 font-body text-sm text-ink outline-none focus-visible:border-ember"
              />
              <EmojiPicker onSelect={insertIntoDescription} label="Inserir emoji do servidor" />
            </div>
            {form.description.length > 0 && descriptionError ? (
              <p className="font-body text-xs text-danger">{descriptionError}</p>
            ) : null}
          </div>

          <ImageUrlField
            value={form.imageUrl}
            onChange={(next) => setForm((current) => ({ ...current, imageUrl: next }))}
            error={imageUrl.length > 0 ? imageUrlError : null}
          />

          <ColorField
            label="Cor do painel (opcional)"
            value={form.color}
            onChange={(next) => setForm((current) => ({ ...current, color: next }))}
            error={color.length > 0 ? colorError : null}
          />

          <div className="flex flex-col gap-2 border-t border-line pt-5">
            <span className="font-body text-xs font-medium text-ink-muted">Layout</span>
            <div className="flex flex-wrap gap-2">
              <KindChip
                active={form.layout === "embed"}
                onClick={() => setForm((current) => ({ ...current, layout: "embed" }))}
              >
                Embed
              </KindChip>
              <KindChip
                active={form.layout === "container"}
                onClick={() => setForm((current) => ({ ...current, layout: "container" }))}
              >
                Container (banner no topo)
              </KindChip>
            </div>
            <p className="font-body text-xs text-ink-muted">
              {form.layout === "container"
                ? "Imagem como banner no topo; título e descrição viram texto (emoji do servidor funciona no título). Trocar o layout de um painel já publicado reposta a mensagem (novo ID)."
                : "Formato clássico: imagem embaixo, barra colorida à esquerda. Emoji customizado não renderiza no título."}
            </p>
            {layoutError ? (
              <p role="alert" className="font-body text-xs text-danger">
                {layoutError}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2 border-t border-line pt-5">
            <span className="font-body text-xs font-medium text-ink-muted">Tipo de painel</span>
            <div className="flex flex-wrap gap-2">
              <KindChip
                active={form.kind === "buttons"}
                onClick={() => setForm((current) => ({ ...current, kind: "buttons" }))}
              >
                Botões
              </KindChip>
              <KindChip
                active={form.kind === "select"}
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    kind: "select",
                    selectOptions:
                      current.selectOptions.length > 0
                        ? current.selectOptions
                        : current.buttons.map((button) => ({
                            key: createLocalButtonId(),
                            label: button.label,
                            description: null,
                            emoji: button.emoji,
                            action: button.action
                          }))
                  }))
                }
              >
                Dropdown
              </KindChip>
              <KindChip
                active={form.kind === "text"}
                onClick={() => setForm((current) => ({ ...current, kind: "text" }))}
              >
                Somente texto
              </KindChip>
            </div>
            <p className="font-body text-xs text-ink-muted">
              {form.kind === "select"
                ? "Um único menu suspenso no lugar das linhas de botões. Cada opção dispara uma ação."
                : form.kind === "text"
                  ? "Painel informativo: só a mensagem. Botões são opcionais (adicione se quiser)."
                  : "Até 25 botões em linhas de 5. Cada botão dispara uma ação."}
            </p>
          </div>

          <div className="border-t border-line pt-5">
            {form.kind === "select" ? (
              <>
                <SelectOptionEditorList
                  placeholder={form.placeholder}
                  options={form.selectOptions}
                  categories={categories}
                  onPlaceholderChange={(next) =>
                    setForm((current) => ({ ...current, placeholder: next }))
                  }
                  onOptionsChange={(next) =>
                    setForm((current) => ({ ...current, selectOptions: next }))
                  }
                />
                {selectError ? (
                  <p role="alert" className="mt-2 font-body text-xs text-danger">
                    {selectError}
                  </p>
                ) : null}
              </>
            ) : (
              <>
                <ButtonEditorList
                  buttons={form.buttons}
                  categories={categories}
                  onChange={(next) => setForm((current) => ({ ...current, buttons: next }))}
                />
                {buttonsError ? (
                  <p role="alert" className="mt-2 font-body text-xs text-danger">
                    {buttonsError}
                  </p>
                ) : null}
              </>
            )}
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

        {/* Mobile: preview fixada no topo (order-first), com altura limitada
            e scroll proprio; o formulario rola por baixo. Desktop (lg):
            volta a ser a coluna da direita, sticky logo abaixo do topo. */}
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

function KindChip({
  active,
  onClick,
  children
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-lg border px-3 py-1.5 font-display text-xs font-semibold transition-colors ${
        active
          ? "border-ember bg-ember/10 text-ember"
          : "border-line text-ink-muted hover:border-ember/60 hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}
