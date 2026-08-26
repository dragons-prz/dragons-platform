import { Navigate } from "react-router-dom";

import { DISCORD_LOGIN_URL } from "../api/auth";
import { DiscordIcon } from "../components/icons";
import { LoadingScreen } from "../components/StatusScreen";
import { useAuth } from "../context/AuthContext";

export function LoginPage() {
  const { state } = useAuth();

  if (state.status === "loading") {
    return <LoadingScreen label="Verificando sessao..." />;
  }

  if (state.status === "authenticated") {
    return <Navigate to="/paineis" replace />;
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-ground px-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="font-display text-3xl font-extrabold tracking-tight text-ink">
          Dragons
        </span>
        <p className="max-w-xs font-body text-sm text-ink-muted">
          Painel administrativo do servidor Dragons. Entre com sua conta do Discord para continuar.
        </p>
      </div>

      <a
        href={DISCORD_LOGIN_URL}
        className="inline-flex items-center gap-2 rounded-lg bg-ember px-5 py-3 font-display text-sm font-semibold text-on-accent transition-colors hover:bg-ember/90"
      >
        <DiscordIcon className="h-5 w-5" />
        Entrar com Discord
      </a>

      {state.status === "error" && (
        <p
          className="max-w-xs rounded-md border-l-2 border-danger bg-surface px-3 py-2 text-center font-body text-xs text-ink-muted"
          role="alert"
        >
          Nao foi possivel verificar sua sessao agora ({state.message}). Voce ainda pode tentar
          entrar com o Discord.
        </p>
      )}
    </main>
  );
}
