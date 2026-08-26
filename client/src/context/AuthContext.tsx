import type { AuthSession } from "@dragons/shared";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

import { fetchCurrentSession, logoutRequest, UnauthenticatedError } from "../api/auth";

export type AuthState =
  | { status: "loading" }
  | { status: "authenticated"; session: AuthSession }
  | { status: "unauthenticated" }
  | { status: "error"; message: string };

interface AuthContextValue {
  state: AuthState;
  /** Reconsulta /api/auth/me (usado apos logout ou para tentar novamente depois de um erro). */
  refresh: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading" });

    fetchCurrentSession(controller.signal)
      .then((session) => setState({ status: "authenticated", session }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;

        if (error instanceof UnauthenticatedError) {
          setState({ status: "unauthenticated" });
          return;
        }

        const message = error instanceof Error ? error.message : "Erro desconhecido";
        setState({ status: "error", message });
      });

    return () => controller.abort();
  }, [attempt]);

  const refresh = useCallback(() => setAttempt((value) => value + 1), []);

  const logout = useCallback(async () => {
    await logoutRequest();
    setState({ status: "unauthenticated" });
  }, []);

  return <AuthContext.Provider value={{ state, refresh, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth precisa ser usado dentro de <AuthProvider>");
  }
  return context;
}
