import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";

import { CloseIcon, LogoutIcon, MenuIcon, PanelsIcon, SettingsIcon } from "../components/icons";
import { PresenceBar } from "../components/PresenceBar";
import { useAuth } from "../context/AuthContext";
import { PresenceProvider } from "../context/PresenceContext";

const NAV_ITEMS = [
  { to: "/paineis", label: "Painéis", Icon: PanelsIcon },
  { to: "/suporte", label: "Suporte", Icon: PanelsIcon },
  { to: "/recrutamento", label: "Recrutamento", Icon: PanelsIcon },
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
  const location = useLocation();
  const [navOpen, setNavOpen] = useState(false);

  // Fecha o menu lateral (mobile) ao trocar de rota.
  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname]);

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
    <PresenceProvider>
      <div className="flex min-h-screen bg-ground">
        {/* Backdrop do drawer no mobile. */}
        {navOpen ? (
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={() => setNavOpen(false)}
            className="fixed inset-0 z-40 bg-black/60 md:hidden"
          />
        ) : null}

        <aside
          className={`fixed inset-y-0 left-0 z-50 flex w-60 flex-col gap-6 border-r border-line bg-surface p-4 transition-transform md:static md:z-auto md:translate-x-0 ${
            navOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="px-2 font-display text-lg font-extrabold tracking-tight text-ink">
              Dragons
            </span>
            <button
              type="button"
              onClick={() => setNavOpen(false)}
              aria-label="Fechar menu"
              className="rounded-lg p-1.5 text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink md:hidden"
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>

          <nav className="flex flex-col gap-1" aria-label="Navegacao principal">
            {NAV_ITEMS.map(({ to, label, Icon }) => (
              <NavLink key={to} to={to} className={navLinkClassName}>
                <Icon className="h-5 w-5" />
                {label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center gap-3 border-b border-line bg-surface px-4 py-3 sm:px-6">
            <button
              type="button"
              onClick={() => setNavOpen(true)}
              aria-label="Abrir menu"
              className="rounded-lg p-1.5 text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink md:hidden"
            >
              <MenuIcon className="h-5 w-5" />
            </button>

            <div className="flex min-w-0 items-center gap-3">
              {session.avatarUrl ? (
                <img
                  src={session.avatarUrl}
                  alt=""
                  className="h-8 w-8 shrink-0 rounded-full border border-line"
                />
              ) : (
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-2 font-display text-xs font-semibold text-ink"
                  aria-hidden="true"
                >
                  {session.username.slice(0, 2).toUpperCase()}
                </span>
              )}
              <span className="truncate font-body text-sm font-medium text-ink">
                {session.username}
              </span>
            </div>

            <div className="ml-auto flex shrink-0 items-center gap-3 sm:gap-4">
              <PresenceBar />

              <button
                type="button"
                onClick={handleLogout}
                className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 font-display text-sm font-medium text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
              >
                <LogoutIcon className="h-5 w-5" />
                <span className="hidden sm:inline">Sair</span>
              </button>
            </div>
          </header>

          <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8">
            <Outlet />
          </main>
        </div>
      </div>
    </PresenceProvider>
  );
}
