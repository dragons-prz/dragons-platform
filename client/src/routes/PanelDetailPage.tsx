import { Link, useParams } from "react-router-dom";

import { fetchPanel } from "../api/panels";
import { BackIcon } from "../components/icons";
import { ErrorScreen, LoadingScreen } from "../components/StatusScreen";
import { DiscordPanelPreview } from "../discord-preview/DiscordPanelPreview";
import { useApiData } from "../hooks/useApiData";

const BUTTON_STYLE_LABELS: Record<string, string> = {
  Primary: "Azul (Primary)",
  Secondary: "Cinza (Secondary)",
  Success: "Verde (Success)",
  Danger: "Vermelho (Danger)"
};

export function PanelDetailPage() {
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

  const panel = state.data;

  return (
    <div className="flex flex-col gap-6">
      <Link
        to="/paineis"
        className="flex w-fit items-center gap-2 font-display text-sm font-medium text-ink-muted transition-colors hover:text-ink"
      >
        <BackIcon className="h-4 w-4" />
        Voltar para painéis
      </Link>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
        <div className="flex flex-col gap-6 rounded-xl border border-line bg-surface p-6">
          <div>
            <span className="font-mono text-xs text-ink-muted">{panel.id}</span>
            <h1 className="mt-1 font-display text-2xl font-bold text-ink">{panel.title}</h1>
            <p className="mt-2 font-body text-sm text-ink-muted">{panel.description}</p>
          </div>

          <dl className="grid grid-cols-2 gap-4 border-t border-line pt-4 font-body text-sm">
            <div>
              <dt className="text-ink-muted">Criado em</dt>
              <dd className="text-ink">{formatDate(panel.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">Atualizado em</dt>
              <dd className="text-ink">{formatDate(panel.updatedAt)}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">Imagem</dt>
              <dd className="text-ink">{panel.imageUrl ? "Definida" : "Nenhuma"}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">Botões</dt>
              <dd className="text-ink">{panel.buttons.length} de 25 (máximo do Discord)</dd>
            </div>
          </dl>

          <div className="border-t border-line pt-4">
            <h2 className="font-display text-sm font-semibold text-ink">Botões</h2>
            {panel.buttons.length === 0 ? (
              <p className="mt-2 font-body text-sm text-ink-muted">
                Este painel ainda não tem botões.
              </p>
            ) : (
              <ul className="mt-3 flex flex-col gap-2">
                {panel.buttons.map((button) => (
                  <li
                    key={button.id}
                    className="flex flex-col gap-1 rounded-lg border border-line px-3 py-2 font-body text-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-ink">{button.label}</span>
                      <span className="font-mono text-xs text-ink-muted">
                        {BUTTON_STYLE_LABELS[button.style] ?? button.style}
                      </span>
                    </div>
                    <span className="font-mono text-xs text-ink-muted">
                      id: {button.id} · ordem: {button.order}
                      {button.emoji ? ` · emoji: ${button.emoji}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="font-display text-sm font-semibold text-ink-muted">
            Pré-visualização (como aparece no Discord)
          </h2>
          <DiscordPanelPreview panel={panel} />
          <p className="font-body text-xs text-ink-muted">
            Clique em um botão acima para ver a resposta efêmera que o membro receberia.
          </p>
        </div>
      </div>
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(
      new Date(iso)
    );
  } catch {
    return iso;
  }
}
