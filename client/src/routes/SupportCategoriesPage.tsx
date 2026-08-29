import { Link } from "react-router-dom";

import { fetchSupportCategories } from "../api/support-categories";
import { PanelsIcon } from "../components/icons";
import { ErrorScreen, LoadingScreen } from "../components/StatusScreen";
import { usePresenceLocation } from "../context/PresenceContext";
import { useApiData } from "../hooks/useApiData";

/**
 * Lista das categorias de ticket de suporte. Cada categoria define onde o
 * topico privado nasce, quais cargos atendem e as mensagens do ticket — o
 * bot le isso ao acionar a acao `support-ticket` de um painel.
 */
export function SupportCategoriesPage() {
  usePresenceLocation("support-categories");
  const state = useApiData(fetchSupportCategories, []);

  if (state.status === "loading") {
    return <LoadingScreen label="Carregando categorias..." />;
  }
  if (state.status === "error") {
    return <ErrorScreen title="Não foi possível carregar as categorias" message={state.message} />;
  }

  const categories = state.data;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Suporte</h1>
          <p className="mt-1 font-body text-sm text-ink-muted">
            Categorias de ticket usadas pela ação "Abrir ticket de suporte" dos painéis.
          </p>
        </div>
        <Link
          to="/suporte/novo"
          className="rounded-lg bg-ember px-4 py-2 font-display text-sm font-semibold text-on-accent transition-colors hover:bg-ember/85"
        >
          Nova categoria
        </Link>
      </div>

      {categories.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-xl border border-line bg-surface p-8">
          <PanelsIcon className="h-8 w-8 text-ink-muted" />
          <h2 className="font-display text-lg font-semibold text-ink">Nenhuma categoria ainda</h2>
          <p className="max-w-md font-body text-sm text-ink-muted">
            Crie uma categoria para poder referenciá-la numa opção de dropdown ou botão de painel.
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {categories.map((category) => (
            <li key={category.id}>
              <Link
                to={`/suporte/${encodeURIComponent(category.id)}`}
                className="flex h-full flex-col gap-3 rounded-xl border border-line bg-surface p-5 transition-colors hover:border-ember/60 hover:bg-surface-2"
              >
                <span className="font-mono text-xs text-ink-muted">{category.id}</span>
                <h2 className="font-display text-lg font-semibold text-ink">{category.name}</h2>
                <div className="mt-auto flex flex-wrap items-center gap-3 border-t border-line pt-3 font-body text-xs text-ink-muted">
                  <span>
                    {category.supportRoleIds.length}{" "}
                    {category.supportRoleIds.length === 1
                      ? "cargo de suporte"
                      : "cargos de suporte"}
                  </span>
                  <span>canal-pai #{category.parentChannelId.slice(-4)}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
