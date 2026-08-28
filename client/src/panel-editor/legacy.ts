import type { PanelActionConfig } from "@dragons/shared";

/**
 * Mantem os campos legados `response`/`responseImageUrl`/`responseColor` de
 * um botao em sincronia com a acao atual: espelham a acao `reply` e ficam
 * vazios quando a acao e `run`. O servidor faz o mesmo em `assignButtonIds`;
 * aqui e so para o preview e para o payload continuar consistente.
 */
export function syncLegacyReplyFields(action: PanelActionConfig): {
  response: string;
  responseImageUrl: string | null;
  responseColor: string | null;
} {
  if (action.type === "reply") {
    return {
      response: action.response,
      responseImageUrl: action.responseImageUrl,
      responseColor: action.responseColor
    };
  }
  return { response: "", responseImageUrl: null, responseColor: null };
}
