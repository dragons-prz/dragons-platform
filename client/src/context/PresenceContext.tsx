import type { PresenceUser } from "@dragons/shared";
import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

import { dropPresenceOnUnload, sendPresenceHeartbeat } from "../api/presence";

/** Intervalo entre heartbeats. O TTL do servidor e ~45s (2 batidas de folga). */
const HEARTBEAT_INTERVAL_MS = 20_000;

interface PresenceContextValue {
  /** Todos os usuarios ativos, incluindo o proprio. */
  users: PresenceUser[];
  /** Define a tela atual reportada nos heartbeats. */
  setLocation: (location: string) => void;
}

const PresenceContext = createContext<PresenceContextValue | null>(null);

/**
 * Mantem um heartbeat de presenca enquanto a aba esta aberta e visivel, e
 * expoe a lista de quem esta online. Deve ficar dentro da area
 * autenticada (montado por `AppLayout`, que so renderiza logado) — sem
 * sessao valida os heartbeats tomariam 401.
 */
export function PresenceProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<PresenceUser[]>([]);
  const [location, setLocation] = useState<string>("unknown");

  useEffect(() => {
    let cancelled = false;

    const beat = async () => {
      if (typeof document !== "undefined" && document.hidden) return;
      try {
        const response = await sendPresenceHeartbeat(location);
        if (!cancelled) setUsers(response.users);
      } catch {
        // Presenca e best-effort: silencia erros de rede/sessao para nao
        // poluir a UI nem competir com o AuthContext no tratamento de 401.
      }
    };

    void beat();
    const interval = window.setInterval(() => void beat(), HEARTBEAT_INTERVAL_MS);

    const onVisibilityChange = () => {
      if (!document.hidden) void beat();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", dropPresenceOnUnload);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", dropPresenceOnUnload);
    };
  }, [location]);

  // Saida limpa ao desmontar o provider (logout leva o `AppLayout` a
  // deixar de renderizar). Efeito separado com deps `[]` para nao disparar
  // a cada troca de tela.
  useEffect(() => {
    return () => dropPresenceOnUnload();
  }, []);

  return (
    <PresenceContext.Provider value={{ users, setLocation }}>{children}</PresenceContext.Provider>
  );
}

export function usePresence(): PresenceContextValue {
  const context = useContext(PresenceContext);
  if (!context) {
    throw new Error("usePresence precisa ser usado dentro de <PresenceProvider>");
  }
  return context;
}

/**
 * Declara em que tela a pagina atual esta, para os heartbeats reportarem.
 * Chame no topo do componente de rota, antes de qualquer `return`
 * condicional (regras de hooks).
 */
export function usePresenceLocation(location: string): void {
  const { setLocation } = usePresence();
  useEffect(() => {
    setLocation(location);
    return () => setLocation("unknown");
  }, [location, setLocation]);
}
