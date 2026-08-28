import { slugify, validateSupportCategoryId } from "@dragons/shared";
import { useId, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { ApiError } from "../api/client";
import { fetchGuildChannels } from "../api/guild";
import { createSupportCategory } from "../api/support-categories";
import { BackIcon } from "../components/icons";
import { ErrorScreen, LoadingScreen } from "../components/StatusScreen";
import { useApiData } from "../hooks/useApiData";

export function SupportCategoryCreatePage() {
  const navigate = useNavigate();
  const fieldId = useId();
  const channelsState = useApiData(fetchGuildChannels, []);

  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [parentChannelId, setParentChannelId] = useState("");
  const [status, setStatus] = useState<"idle" | "saving">("idle");
  const [error, setError] = useState<string | null>(null);

  if (channelsState.status === "loading") {
    return <LoadingScreen label="Carregando canais..." />;
  }
  if (channelsState.status === "error") {
    return (
      <ErrorScreen title="Não foi possível carregar os canais" message={channelsState.message} />
    );
  }

  const idError = id.length > 0 ? validateSupportCategoryId(id) : null;
  const canSubmit =
    status === "idle" &&
    id.length > 0 &&
    name.trim().length > 0 &&
    parentChannelId.length > 0 &&
    !idError;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    setStatus("saving");
    setError(null);
    try {
      const category = await createSupportCategory({ id, name, parentChannelId });
      navigate(`/suporte/${encodeURIComponent(category.id)}`);
    } catch (submitError) {
      setStatus("idle");
      setError(
        submitError instanceof ApiError
          ? submitError.message
          : "Não foi possível criar a categoria."
      );
    }
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <Link
        to="/suporte"
        className="flex w-fit items-center gap-2 font-display text-sm font-medium text-ink-muted transition-colors hover:text-ink"
      >
        <BackIcon className="h-4 w-4" />
        Voltar para suporte
      </Link>

      <form
        onSubmit={(event) => void handleSubmit(event)}
        className="flex flex-col gap-5 rounded-xl border border-line bg-surface p-4 sm:p-6"
      >
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Nova categoria de suporte</h1>
          <p className="mt-1 font-body text-sm text-ink-muted">
            Depois de criar, configure cargos e mensagens na página de edição.
          </p>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor={`${fieldId}-id`} className="font-body text-xs font-medium text-ink-muted">
            Identificador (id) — não pode ser alterado depois
          </label>
          <input
            id={`${fieldId}-id`}
            type="text"
            value={id}
            onChange={(event) => setId(slugify(event.target.value))}
            placeholder="ex.: denuncia-de-membro"
            className="rounded-lg border border-line bg-ground px-3 py-2 font-mono text-sm text-ink outline-none focus-visible:border-ember"
            aria-invalid={Boolean(idError)}
          />
          {idError ? <p className="font-body text-xs text-danger">{idError}</p> : null}
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor={`${fieldId}-name`}
            className="font-body text-xs font-medium text-ink-muted"
          >
            Nome
          </label>
          <input
            id={`${fieldId}-name`}
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="ex.: Denúncia de membro"
            className="rounded-lg border border-line bg-ground px-3 py-2 font-body text-sm text-ink outline-none focus-visible:border-ember"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor={`${fieldId}-parent`}
            className="font-body text-xs font-medium text-ink-muted"
          >
            Canal-pai (onde o tópico privado do ticket é criado)
          </label>
          <select
            id={`${fieldId}-parent`}
            value={parentChannelId}
            onChange={(event) => setParentChannelId(event.target.value)}
            className="rounded-lg border border-line bg-ground px-3 py-2 font-body text-sm text-ink outline-none focus-visible:border-ember"
          >
            <option value="">Selecione um canal…</option>
            {channelsState.data.map((channel) => (
              <option key={channel.id} value={channel.id}>
                #{channel.name}
              </option>
            ))}
          </select>
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
          {status === "saving" ? "Criando..." : "Criar categoria"}
        </button>
      </form>
    </div>
  );
}
