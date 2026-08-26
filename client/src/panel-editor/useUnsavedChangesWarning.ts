import { useEffect } from "react";

/**
 * Avisa o usuario ao tentar fechar/recarregar a aba com alteracoes nao
 * salvas (prompt nativo do navegador). Navegacao dentro do proprio app
 * (ex.: o link "Voltar" da pagina de edicao) precisa checar `isDirty`
 * separadamente antes de navegar, ja que o roteador desta SPA nao usa um
 * "data router" com suporte a bloqueio de navegacao.
 */
export function useUnsavedChangesWarning(isDirty: boolean): void {
  useEffect(() => {
    if (!isDirty) return;

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      // Chrome exige `returnValue` definido para mostrar o prompt nativo.
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);
}
