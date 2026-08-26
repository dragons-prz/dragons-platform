/**
 * Formatos MINIMOS de recursos do Discord expostos pelo painel (nao sao
 * espelho de tipos do bot — sao subconjuntos da API do Discord que o
 * cliente precisa para resolver IDs em nomes legiveis).
 */

/** Canal de texto elegivel para publicar paineis ou receber logs. */
export interface DiscordChannelSummary {
  id: string;
  name: string;
  /** Tipo bruto do canal na API do Discord (0 = texto, 5 = anuncio). */
  type: number;
}

/** Cargo do servidor, sem o @everyone. */
export interface DiscordRoleSummary {
  id: string;
  name: string;
  /** Cor decimal do cargo (0 = sem cor customizada). */
  color: number;
}

/** Emoji customizado do servidor. */
export interface DiscordEmojiSummary {
  id: string;
  name: string;
  animated: boolean;
}
