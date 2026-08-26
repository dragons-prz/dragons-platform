import { Navigate, Outlet } from "react-router-dom";

import { ErrorScreen, LoadingScreen } from "../components/StatusScreen";
import { useAuth } from "../context/AuthContext";

/**
 * Guarda de rota: consulta o estado de sessao ja carregado pelo
 * AuthProvider e decide entre mostrar carregamento, erro (com retry),
 * redirecionar para login, ou liberar as rotas filhas.
 */
export function ProtectedRoute() {
  const { state, refresh } = useAuth();

  if (state.status === "loading") {
    return <LoadingScreen label="Verificando sessao..." />;
  }

  if (state.status === "error") {
    return (
      <ErrorScreen
        title="Nao foi possivel verificar sua sessao"
        message={state.message}
        action={
          <button
            type="button"
            onClick={refresh}
            className="rounded-lg bg-ember px-4 py-2 font-display text-sm font-semibold text-on-accent transition-colors hover:bg-ember/90"
          >
            Tentar novamente
          </button>
        }
      />
    );
  }

  if (state.status === "unauthenticated") {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
