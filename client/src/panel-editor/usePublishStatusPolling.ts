import type { PanelJobStatus } from "@dragons/shared";
import { useCallback, useRef, useState } from "react";

import { fetchPublishStatus } from "../api/panels";

const POLL_INTERVAL_MS = 2000;
const TIMEOUT_MS = 30000;

export type PublishPollingState =
  | { phase: "idle" }
  | { phase: "polling" }
  | { phase: "completed"; messageId: string | null }
  | { phase: "failed"; error: string }
  | { phase: "timeout" };

/**
 * Faz polling de `GET /api/panels/:id/publish-status` ate o job mais
 * recente sair de `pending`/`processing`, ou ate estourar um timeout de
 * ~30s (o worker do bot roda a cada 5s; 30s da folga para picos/bot
 * reiniciando sem travar a tela indefinidamente).
 */
export function usePublishStatusPolling(panelId: string) {
  const [state, setState] = useState<PublishPollingState>({ phase: "idle" });
  const tokenRef = useRef(0);

  const start = useCallback(
    (onSettled?: (status: Extract<PublishPollingState, { phase: "completed" }>) => void) => {
      const token = ++tokenRef.current;
      const deadline = Date.now() + TIMEOUT_MS;
      setState({ phase: "polling" });

      const tick = async () => {
        if (tokenRef.current !== token) return;
        try {
          const job = await fetchPublishStatus(panelId);
          if (tokenRef.current !== token) return;

          const status: PanelJobStatus | undefined = job?.status;
          if (status === "completed") {
            const settled: Extract<PublishPollingState, { phase: "completed" }> = {
              phase: "completed",
              messageId: job?.messageId ?? null
            };
            setState(settled);
            onSettled?.(settled);
            return;
          }
          if (status === "failed") {
            setState({ phase: "failed", error: job?.error ?? "Falha ao publicar no Discord." });
            return;
          }

          if (Date.now() >= deadline) {
            setState({ phase: "timeout" });
            return;
          }

          window.setTimeout(() => void tick(), POLL_INTERVAL_MS);
        } catch {
          if (tokenRef.current !== token) return;
          if (Date.now() >= deadline) {
            setState({ phase: "timeout" });
            return;
          }
          window.setTimeout(() => void tick(), POLL_INTERVAL_MS);
        }
      };

      void tick();
    },
    [panelId]
  );

  const reset = useCallback(() => {
    tokenRef.current++;
    setState({ phase: "idle" });
  }, []);

  return { state, start, reset };
}
