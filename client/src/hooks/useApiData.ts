import { useEffect, useState } from "react";

export type ApiDataState<T> =
  { status: "loading" } | { status: "error"; message: string } | { status: "ready"; data: T };

/**
 * Hook generico para carregar dados de leitura da API do painel. Cada
 * pagina passa uma funcao de fetch (que aceita `AbortSignal`) e uma lista
 * de dependencias — reexecuta quando as dependencias mudam, cancelando a
 * requisicao anterior.
 */
export function useApiData<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  deps: unknown[]
): ApiDataState<T> {
  const [state, setState] = useState<ApiDataState<T>>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading" });

    fetcher(controller.signal)
      .then((data) => setState({ status: "ready", data }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        const message = error instanceof Error ? error.message : "Erro desconhecido";
        setState({ status: "error", message });
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}
