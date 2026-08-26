import { useEffect, useState } from "react";

interface HealthResponse {
  status: "ok";
}

type HealthState =
  | { kind: "loading" }
  | { kind: "ok"; response: HealthResponse }
  | { kind: "error"; message: string };

export function App() {
  const [health, setHealth] = useState<HealthState>({ kind: "loading" });

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/health", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.json() as Promise<HealthResponse>;
      })
      .then((response) => setHealth({ kind: "ok", response }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        const message = error instanceof Error ? error.message : "Erro desconhecido";
        setHealth({ kind: "error", message });
      });

    return () => controller.abort();
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-ground px-6 text-center text-ink">
      <h1 className="font-display text-4xl font-bold tracking-tight text-ink">Dragons Painel</h1>
      <p className="font-body text-ink-muted">
        Painel administrativo do bot Dragons — fase 0 (scaffold).
      </p>
      <p className="font-mono text-sm text-ink-muted">
        {health.kind === "loading" && "Consultando /api/health..."}
        {health.kind === "ok" && `/api/health -> ${JSON.stringify(health.response)}`}
        {health.kind === "error" && `/api/health falhou: ${health.message}`}
      </p>
    </main>
  );
}
