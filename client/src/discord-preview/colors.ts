/**
 * ============================================================================
 * TOKENS LITERAIS DO DISCORD — NAO SAO TOKENS DE DESIGN DO PAINEL.
 * ============================================================================
 *
 * Este modulo e a UNICA excecao a regra "nunca hex solto" do resto do
 * codigo (ver `client/src/index.css`). O objetivo da pre-visualizacao e
 * mostrar exatamente como a mensagem vai aparecer no Discord — se essas
 * cores seguissem a paleta do painel elas mentiriam para o usuario sobre o
 * resultado final. Por isso todo valor aqui e o hex real do tema escuro do
 * cliente Discord (nao um token do Open Color, nao um valor aproximado).
 *
 * Nao importe estes valores fora de `discord-preview/`. Qualquer UI do
 * painel em si (botoes, cards, navegacao) usa os tokens de
 * `client/src/index.css`.
 */

export const discordColors = {
  /** Fundo da mensagem (a "bolha" onde o embed fica). */
  messageSurface: "#313338",
  /** Fundo do proprio embed. */
  embedSurface: "#2b2d31",
  /** Cor padrao da barra lateral do embed quando nenhuma cor e definida. */
  embedAccentDefault: "#232428",

  embedTitle: "#f2f3f5",
  embedText: "#dbdee1",
  /** Nome de usuario/autor do embed, quando presente. */
  embedAuthor: "#ffffff",

  /** Rodape efemero ("Só você pode ver esta mensagem"). */
  ephemeralFooter: "#949ba4",
  /** Fundo da mensagem efemera (mesmo tom do embed, discord nao diferencia). */
  ephemeralSurface: "#2b2d31",

  buttonPrimary: "#5865f2",
  buttonSecondary: "#4e5058",
  buttonSuccess: "#248046",
  buttonDanger: "#da373c",
  buttonText: "#ffffff",

  /** Hover approximado — Discord clareia levemente cada estilo de botao. */
  buttonPrimaryHover: "#4752c4",
  buttonSecondaryHover: "#6d6f78",
  buttonSuccessHover: "#1a6334",
  buttonDangerHover: "#a12828"
} as const;

export type DiscordButtonStyle = "Primary" | "Secondary" | "Success" | "Danger";

export const buttonStyleColors: Record<DiscordButtonStyle, { background: string; hover: string }> =
  {
    Primary: { background: discordColors.buttonPrimary, hover: discordColors.buttonPrimaryHover },
    Secondary: {
      background: discordColors.buttonSecondary,
      hover: discordColors.buttonSecondaryHover
    },
    Success: { background: discordColors.buttonSuccess, hover: discordColors.buttonSuccessHover },
    Danger: { background: discordColors.buttonDanger, hover: discordColors.buttonDangerHover }
  };

/**
 * Pilha de fontes REAL do cliente Discord — de proposito diferente da
 * tipografia do painel (Archivo/Source Sans 3). O contraste visual entre
 * as duas e o que deixa claro, so de olhar, o que e "a ferramenta" e o que
 * e "o que vai aparecer no Discord". Nao unifique com `--font-display`/
 * `--font-body`.
 */
export const discordFontFamily =
  '"gg sans", "Noto Sans", "Helvetica Neue", Helvetica, Arial, sans-serif';
