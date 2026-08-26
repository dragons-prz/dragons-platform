import { useNavigate, useSearchParams } from "react-router-dom";

import { DISCORD_LOGIN_URL } from "../api/auth";
import { WarningIcon } from "../components/icons";
import { useAuth } from "../context/AuthContext";

const REASON_MESSAGES: Record<string, string> = {
  not_in_guild: "Sua conta do Discord nao esta no servidor Dragons.",
  no_permission:
    "Voce esta no servidor Dragons, mas nao tem o cargo de founder nem permissao de administrador.",
  oauth_error: "Nao foi possivel concluir o login com o Discord.",
  state_mismatch: "A verificacao de seguranca do login falhou. Tente novamente."
};

const DEFAULT_MESSAGE = "Voce nao tem permissao para acessar o painel Dragons.";

export function AccessDeniedPage() {
  const [searchParams] = useSearchParams();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const reason = searchParams.get("motivo") ?? "";
  const message = REASON_MESSAGES[reason] ?? DEFAULT_MESSAGE;

  const handleLogout = () => {
    void logout().finally(() => navigate("/login", { replace: true }));
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-ground px-6 text-center">
      <WarningIcon className="h-10 w-10 text-danger" />

      <div className="flex flex-col gap-2">
        <h1 className="font-display text-2xl font-bold text-ink">Acesso negado</h1>
        <p className="max-w-sm font-body text-sm text-ink-muted">{message}</p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <a
          href={DISCORD_LOGIN_URL}
          className="rounded-lg border border-line px-4 py-2 font-display text-sm font-semibold text-ink transition-colors hover:border-ember"
        >
          Tentar novamente
        </a>
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-lg bg-surface px-4 py-2 font-display text-sm font-semibold text-ink transition-colors hover:bg-surface-2"
        >
          Sair
        </button>
      </div>
    </main>
  );
}
