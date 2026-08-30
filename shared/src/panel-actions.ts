/**
 * Manifesto das acoes `run` de painel (`PanelActionConfig` do tipo `run`).
 *
 * NAO e espelho de um tipo do bot — e um contrato compartilhado entre os
 * dois repos: o bot valida `actionId` contra o `PANEL_ACTION_REGISTRY` em
 * runtime; a dragons-platform usa este array para montar o formulario do
 * editor de painel. Adicionar/remover uma acao aqui e uma mudanca
 * coordenada nos dois repos.
 */

export type PanelActionParamKind = "text" | "support-category-ref";

export interface PanelActionParamSpec {
  key: string;
  label: string;
  required: boolean;
  kind: PanelActionParamKind;
  help?: string;
}

export interface PanelActionSpec {
  id: string;
  label: string;
  description: string;
  params: PanelActionParamSpec[];
}

export const PANEL_ACTIONS: readonly PanelActionSpec[] = [
  {
    id: "support-ticket",
    label: "Abrir ticket de suporte",
    description:
      "Cria um topico privado de atendimento para quem clicou, marca o suporte e registra o ticket.",
    params: [
      {
        key: "category",
        label: "Categoria de suporte",
        required: true,
        kind: "support-category-ref",
        help: "Define canal-pai, cargos de suporte e as mensagens do ticket."
      }
    ]
  },
  {
    id: "verification-ticket",
    label: "Abrir verificação (Verificar-se)",
    description:
      "Pergunta “Veio por alguém?” e abre a thread privada do ticket de verificação. Toda a configuração vem da aba Recrutamento › Ticket e rotas; não tem parâmetros.",
    params: []
  }
];

export function getPanelActionSpec(actionId: string): PanelActionSpec | undefined {
  return PANEL_ACTIONS.find((action) => action.id === actionId);
}
