import type { PanelConfig } from "@dragons/shared";
import {
  PANEL_LIMITS,
  slugify,
  validateDescription,
  validatePanelId,
  validateTitle
} from "@dragons/shared";
import { useId, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { createPanel } from "../api/panels";
import { ApiError } from "../api/client";
import { BackIcon } from "../components/icons";
import { CharacterCounter } from "../panel-editor/CharacterCounter";
import { DiscordPanelPreview } from "../discord-preview/DiscordPanelPreview";

const EMPTY_PANEL_FOR_PREVIEW: Omit<PanelConfig, "id" | "title" | "description"> = {
  guildId: "",
  imageUrl: null,
  color: null,
  kind: "buttons",
  layout: "embed",
  buttons: [],
  select: null,
  createdAt: "",
  updatedAt: ""
};

export function PanelCreatePage() {
  const navigate = useNavigate();
  const fieldId = useId();

  const [id, setId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"idle" | "saving">("idle");
  const [error, setError] = useState<string | null>(null);

  const idError = id.length > 0 ? validatePanelId(id) : null;
  const titleError = title.length > 0 ? validateTitle(title) : null;
  const descriptionError = description.length > 0 ? validateDescription(description) : null;

  const canSubmit =
    status === "idle" &&
    id.length > 0 &&
    title.trim().length > 0 &&
    description.trim().length > 0 &&
    !idError &&
    !titleError &&
    !descriptionError;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;

    setStatus("saving");
    setError(null);
    try {
      const panel = await createPanel({ id, title, description });
      navigate(`/paineis/${encodeURIComponent(panel.id)}`);
    } catch (submitError) {
      setStatus("idle");
      setError(
        submitError instanceof ApiError ? submitError.message : "Não foi possível criar o painel."
      );
    }
  }

  const previewPanel: PanelConfig = {
    ...EMPTY_PANEL_FOR_PREVIEW,
    id: id || "id-do-painel",
    title: title || "Título do painel",
    description: description || "A descrição do painel aparece aqui."
  };

  return (
    <div className="flex flex-col gap-6">
      <Link
        to="/paineis"
        className="flex w-fit items-center gap-2 font-display text-sm font-medium text-ink-muted transition-colors hover:text-ink"
      >
        <BackIcon className="h-4 w-4" />
        Voltar para painéis
      </Link>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,34rem)]">
        <form
          onSubmit={(event) => void handleSubmit(event)}
          className="flex flex-col gap-5 rounded-xl border border-line bg-surface p-4 sm:p-6"
        >
          <div>
            <h1 className="font-display text-2xl font-bold text-ink">Criar painel</h1>
            <p className="mt-1 font-body text-sm text-ink-muted">
              Depois de criado, adicione imagem e botões na página de edição.
            </p>
          </div>

          <div className="flex flex-col gap-1">
            <label
              htmlFor={`${fieldId}-id`}
              className="font-body text-xs font-medium text-ink-muted"
            >
              Identificador (id) — não pode ser alterado depois
            </label>
            <input
              id={`${fieldId}-id`}
              type="text"
              value={id}
              onChange={(event) => setId(slugify(event.target.value))}
              placeholder="ex.: guia-recrutamento"
              className="rounded-lg border border-line bg-ground px-3 py-2 font-mono text-sm text-ink outline-none focus-visible:border-ember"
              aria-invalid={Boolean(idError)}
            />
            {idError ? <p className="font-body text-xs text-danger">{idError}</p> : null}
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <label
                htmlFor={`${fieldId}-title`}
                className="font-body text-xs font-medium text-ink-muted"
              >
                Título
              </label>
              <CharacterCounter current={title.length} max={PANEL_LIMITS.TITLE_MAX} />
            </div>
            <input
              id={`${fieldId}-title`}
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="rounded-lg border border-line bg-ground px-3 py-2 font-body text-sm text-ink outline-none focus-visible:border-ember"
              aria-invalid={Boolean(titleError)}
            />
            {titleError ? <p className="font-body text-xs text-danger">{titleError}</p> : null}
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <label
                htmlFor={`${fieldId}-description`}
                className="font-body text-xs font-medium text-ink-muted"
              >
                Descrição
              </label>
              <CharacterCounter current={description.length} max={PANEL_LIMITS.DESCRIPTION_MAX} />
            </div>
            <textarea
              id={`${fieldId}-description`}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={6}
              className="resize-y rounded-lg border border-line bg-ground px-3 py-2 font-body text-sm text-ink outline-none focus-visible:border-ember"
              aria-invalid={Boolean(descriptionError)}
            />
            {descriptionError ? (
              <p className="font-body text-xs text-danger">{descriptionError}</p>
            ) : null}
          </div>

          {error ? (
            <p role="alert" className="font-body text-sm text-danger">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-fit rounded-lg bg-ember px-5 py-2.5 font-display text-sm font-semibold text-on-accent transition-colors hover:bg-ember/85 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {status === "saving" ? "Criando..." : "Criar painel"}
          </button>
        </form>

        {/* Mobile: preview fixada no topo (order-first); o formulario rola
            por baixo. Desktop (lg): coluna da direita, sticky. */}
        <div className="sticky top-0 z-20 order-first flex flex-col gap-2 bg-ground pb-2 lg:order-none lg:top-6 lg:z-auto lg:h-fit lg:bg-transparent lg:pb-0">
          <h2 className="font-display text-sm font-semibold text-ink-muted">
            Pré-visualização (como aparece no Discord)
          </h2>
          <div className="max-h-[42vh] overflow-y-auto rounded-lg lg:max-h-none lg:overflow-visible">
            <DiscordPanelPreview panel={previewPanel} />
          </div>
        </div>
      </div>
    </div>
  );
}
