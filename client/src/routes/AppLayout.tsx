import { NavLink, Outlet, useNavigate } from "react-router-dom";

import { LogoutIcon, PanelsIcon, SettingsIcon } from "../components/icons";
import { useAuth } from "../context/AuthContext";

const NAV_ITEMS = [
  { to: "/paineis", label: "Painéis", Icon: PanelsIcon },
  { to: "/suporte", label: "Suporte", Icon: PanelsIcon },
  { to: "/configuracao", label: "Configuração", Icon: SettingsIcon }
];

function navLinkClassName({ isActive }: { isActive: boolean }): string {
  const base =
    "flex items-center gap-3 rounded-lg px-3 py-2 font-display text-sm font-medium transition-colors";
  return isActive
    ? `${base} bg-surface-2 text-ink`
    : `${base} text-ink-muted hover:bg-surface hover:text-ink`;
}

export function AppLayout() {
  const { state, logout } = useAuth();
  const navigate = useNavigate();

  if (state.status !== "authenticated") {
    // ProtectedRoute so renderiza este layout quando autenticado; guarda
    // extra so para o TypeScript ter certeza do formato de `state.session`.
    return null;
  }

  const { session } = state;

  const handleLogout = () => {
    void logout().finally(() => navigate("/login", { replace: true }));
  };

  return (
    <div className="flex min-h-screen bg-ground">
      <aside className="flex w-60 flex-col gap-6 border-r border-line bg-surface p-4">
        <span className="px-2 font-display text-lg font-extrabold tracking-tight text-ink">
          Dragons
        </span>

        <nav className="flex flex-col gap-1" aria-label="Navegacao principal">
          {NAV_ITEMS.map(({ to, label, Icon }) => (
            <NavLink key={to} to={to} className={navLinkClassName}>
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-line bg-surface px-6 py-3">
          <div className="flex items-center gap-3">
            {session.avatarUrl ? (
              <img
                src={session.avatarUrl}
                alt=""
                className="h-8 w-8 rounded-full border border-line"
              />
            ) : (
              <span
                className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-2 font-display text-xs font-semibold text-ink"
                aria-hidden="true"
              >
                {session.username.slice(0, 2).toUpperCase()}
              </span>
            )}
            <span className="font-body text-sm font-medium text-ink">{session.username}</span>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-lg px-3 py-2 font-display text-sm font-medium text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <LogoutIcon className="h-5 w-5" />
            Sair
          </button>
        </header>

        <main className="flex-1 px-6 py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
