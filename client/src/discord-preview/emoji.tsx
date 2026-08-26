import type { ReactNode } from "react";

/**
 * Emoji customizado do Discord no formato de texto bruto:
 * `<:nome:id>` (estatico) ou `<a:nome:id>` (animado). E o formato que o
 * Discord grava quando um emoji customizado e usado em uma mensagem/botao
 * — nao confundir com `:nome:` solto, que NAO e valido (ver abaixo).
 */
const CUSTOM_EMOJI_PATTERN = /<(a)?:(\w{2,32}):(\d{15,25})>/g;

function emojiUrl(id: string, animated: boolean): string {
  return `https://cdn.discordapp.com/emojis/${id}.${animated ? "gif" : "png"}`;
}

/**
 * Converte texto contendo emojis customizados do Discord (`<:nome:id>` ou
 * `<a:nome:id>`) em nos React, trocando cada ocorrencia por um `<img>`
 * alinhado com o texto ao redor.
 *
 * IMPORTANTE — bug real que motivou esta funcao: texto solto no formato
 * `:nome:` (sem os `<>` e sem o id numerico) NAO e um emoji customizado
 * valido para o Discord — ele e exibido literalmente como texto, o
 * Discord so resolve o emoji shortcode "invisivelmente" quando o usuario
 * digita na propria interface (autocompletar), nunca a partir de texto
 * puro vindo de uma mensagem de bot. Por isso esta funcao NAO tenta
 * "adivinhar" `:nome:` — ela deixa esse trecho como texto literal, para
 * que o usuario veja no preview exatamente o erro que veria no Discord
 * real antes de publicar.
 */
export function renderDiscordText(text: string): ReactNode {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  CUSTOM_EMOJI_PATTERN.lastIndex = 0;
  while ((match = CUSTOM_EMOJI_PATTERN.exec(text)) !== null) {
    const [full, animatedFlag, name, id] = match;
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    nodes.push(
      <img
        key={`emoji-${key++}`}
        src={emojiUrl(id, Boolean(animatedFlag))}
        alt={`:${name}:`}
        title={`:${name}:`}
        style={{
          height: "1.375em",
          width: "1.375em",
          verticalAlign: "bottom",
          objectFit: "contain",
          display: "inline-block"
        }}
      />
    );

    lastIndex = match.index + full.length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

/**
 * Resolve o campo `emoji` de um botao de painel (pode ser um emoji
 * customizado `<:nome:id>`/`<a:nome:id>`, um emoji unicode nativo, ou nulo)
 * para um no React pronto para exibir ao lado do label do botao.
 */
export function renderButtonEmoji(emoji: string | null): ReactNode {
  if (!emoji) return null;
  return renderDiscordText(emoji);
}
