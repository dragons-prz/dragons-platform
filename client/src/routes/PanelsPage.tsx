import { parsePanelLocation } from "@dragons/shared";
import { Link } from "react-router-dom";

import { fetchPanels } from "../api/panels";
import { ImageIcon, PanelsIcon } from "../components/icons";
import { renderInlineCompact } from "../discord-preview/markdown";
import { ErrorScreen, LoadingScreen } from "../components/StatusScreen";
import { useAuth } from "../context/AuthContext";
import { usePresence, usePresenceLocation } from "../context/PresenceContext";
import { useApiData } from "../hooks/useApiData";

export function PanelsPage() {
  usePresenceLocation("panels");
  const state = useApiData(fetchPanels, []);
  const { users } = usePresence();
  const { state: authState } = useAuth();
  const selfId = authState.status === "authenticated" ? authState.session.id : null;

  const editorsByPanel = new Map<string, string[]>();
  for (const user of users) {
    if (user.id === selfId) continue;
    const panelId = parsePanelLocation(user.location);
    if (!panelId) continue;
    const list = editorsByPanel.get(panelId) ?? [];
    list.push(user.username);
    editorsByPanel.set(panelId, list);
  }

  if (state.status === "loading") {
    return <LoadingScreen label="Carregando painéis..." />;
  }

  if (state.status === "error") {
    return <ErrorScreen title="Não foi possível carregar os painéis" message={state.message} />;
  }

  const panels = state.data;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Painéis</h1>
          <p className="mt-1 font-body text-sm text-ink-muted">
            Mensagens com botões publicadas pelo bot neste servidor.
          </p>
        </div>

        <Link
          to="/paineis/novo"
          className="rounded-lg bg-ember px-4 py-2 font-display text-sm font-semibold text-on-accent transition-colors hover:bg-ember/85"
        >
          Criar painel
        </Link>
      </div>

      {panels.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-xl border border-line bg-surface p-8">
          <PanelsIcon className="h-8 w-8 text-ink-muted" />
          <h2 className="font-display text-lg font-semibold text-ink">Nenhum painel ainda</h2>
          <p className="max-w-md font-body text-sm text-ink-muted">
            Este servidor ainda não tem painéis. Crie um pelo botão acima ou pelo comando{" "}
            <code className="font-mono text-xs text-ink">/painel criar</code> no Discord.
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {panels.map((panel) => {
            const editors = editorsByPanel.get(panel.id) ?? [];
            return (
              <li key={panel.id}>
                <Link
                  to={`/paineis/${encodeURIComponent(panel.id)}`}
                  className="flex h-full flex-col gap-3 rounded-xl border border-line bg-surface p-5 transition-colors hover:border-ember/60 hover:bg-surface-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs text-ink-muted">{panel.id}</span>
                    {editors.length > 0 ? (
                      <span
                        title={`${editors.join(", ")} ${editors.length === 1 ? "está" : "estão"} editando agora`}
                        className="flex items-center gap-1 rounded-full bg-warn/10 px-2 py-0.5 font-body text-xs font-medium text-warn"
                      >
                        <span aria-hidden="true">✏️</span>
                        <span className="max-w-[10rem] truncate">{editors.join(", ")}</span>
                      </span>
                    ) : null}
                  </div>
                  <h2 className="line-clamp-2 font-display text-lg font-semibold text-ink">
                    {renderInlineCompact(panel.title, `t-${panel.id}`)}
                  </h2>
                  <p className="line-clamp-2 flex-1 font-body text-sm text-ink-muted">
                    {renderInlineCompact(panel.description, `d-${panel.id}`)}
                  </p>

                  <div className="flex items-center gap-4 border-t border-line pt-3 font-body text-xs text-ink-muted">
                    <span>
                      {panel.kind === "select"
                        ? `${panel.select?.options.length ?? 0} ${
                            (panel.select?.options.length ?? 0) === 1 ? "opção" : "opções"
                          }`
                        : `${panel.buttons.length} ${panel.buttons.length === 1 ? "botão" : "botões"}`}
                    </span>
                    {panel.imageUrl ? (
                      <span className="flex items-center gap-1">
                        <ImageIcon className="h-4 w-4" />
                        Com imagem
                      </span>
                    ) : null}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
