import type { PresenceUser } from "@dragons/shared";
import { parsePanelLocation } from "@dragons/shared";

import { useAuth } from "../context/AuthContext";
import { usePresence } from "../context/PresenceContext";
import { WarningIcon } from "./icons";

/** Numero maximo de avatares mostrados antes de virar "+N". */
const MAX_VISIBLE = 5;

/** Texto legivel de onde o usuario esta, para o tooltip dos avatares. */
function describeLocation(location: string): string {
  const panelId = parsePanelLocation(location);
  if (panelId) return `editando o painel ${panelId}`;
  if (location.startsWith("support-category:")) {
    return `editando a categoria ${location.slice("support-category:".length)}`;
  }
  switch (location) {
    case "panels":
      return "nos Painéis";
    case "panel-new":
      return "criando um painel";
    case "settings":
      return "na Configuração";
    case "support-categories":
      return "no Suporte";
    case "support-category-new":
      return "criando uma categoria";
    default:
      return "no painel";
  }
}

function useSelfId(): string | null {
  const { state } = useAuth();
  return state.status === "authenticated" ? state.session.id : null;
}

function PresenceAvatar({ user, title }: { user: PresenceUser; title: string }) {
  if (user.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt={user.username}
        title={title}
        className="h-7 w-7 rounded-full border-2 border-surface bg-surface-2 object-cover"
      />
    );
  }
  return (
    <span
      title={title}
      className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-surface bg-surface-2 font-display text-[10px] font-semibold text-ink"
    >
      {user.username.slice(0, 2).toUpperCase()}
    </span>
  );
}

/**
 * Pilha de avatares de quem mais esta online agora (o proprio usuario nao
 * conta). Some quando so ha o proprio usuario. O tooltip de cada avatar
 * diz em que tela a pessoa esta.
 */
export function PresenceBar() {
  const { users } = usePresence();
  const selfId = useSelfId();

  const others = users.filter((user) => user.id !== selfId);
  if (others.length === 0) return null;

  const visible = others.slice(0, MAX_VISIBLE);
  const overflow = others.length - visible.length;

  return (
    <div
      className="flex items-center"
      aria-label={`${others.length} ${others.length === 1 ? "pessoa ativa" : "pessoas ativas"} no painel`}
    >
      <div className="flex -space-x-2">
        {visible.map((user) => (
          <PresenceAvatar
            key={user.id}
            user={user}
            title={`${user.username} — ${describeLocation(user.location)}`}
          />
        ))}
        {overflow > 0 ? (
          <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-surface bg-surface-2 font-display text-[10px] font-semibold text-ink-muted">
            +{overflow}
          </span>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Aviso mostrado no editor de um painel quando outra pessoa esta com o
 * mesmo painel aberto — as escritas nao tem trava, entao quem salvar por
 * ultimo sobrescreve o outro. Some quando ninguem mais esta no painel.
 */
export function PanelCoEditors({ panelId }: { panelId: string }) {
  const { users } = usePresence();
  const selfId = useSelfId();

  const coEditors = users.filter(
    (user) => user.id !== selfId && parsePanelLocation(user.location) === panelId
  );
  if (coEditors.length === 0) return null;

  const names = coEditors.map((user) => user.username).join(", ");
  const verb = coEditors.length === 1 ? "está" : "estão";

  return (
    <div className="mb-4 flex items-start gap-3 rounded-xl border border-warn/40 bg-warn/10 p-4">
      <WarningIcon className="mt-0.5 h-5 w-5 shrink-0 text-warn" />
      <p className="font-body text-sm text-ink">
        <span className="font-semibold">{names}</span> {verb} com este painel aberto agora. Se as
        duas pessoas salvarem, a última sobrescreve as alterações da outra.
      </p>
    </div>
  );
}
