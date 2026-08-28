import type { CSSProperties, ReactNode } from "react";

import { discordColors } from "./colors";

/**
 * Renderizador aproximado do markdown do Discord para a pre-visualizacao.
 *
 * Cobre o subconjunto que aparece em painel/embed: `**negrito**`,
 * `*italico*` / `_italico_`, `__sublinhado__`, `~~tachado~~`, `` `code` ``,
 * bloco ```` ``` ````, `> ` / `>>> ` citacao, `# `/`## `/`### ` titulos,
 * `-# ` texto pequeno, listas, links, mencoes e emoji customizado.
 *
 * NAO e um parser completo — e "fiel o suficiente" para o usuario ver como
 * o texto vai ficar antes de publicar. Onde o Discord NAO renderiza
 * markdown (titulo de embed, descricao de opcao de select), continue usando
 * `renderDiscordText` de `emoji.tsx`.
 */

const CUSTOM_EMOJI = /<(a)?:(\w{2,32}):(\d{15,25})>/;
const MENTION = /<(@[!&]?|#)(\d{15,25})>/;

const codeStyle: CSSProperties = {
  backgroundColor: "#1e1f22",
  borderRadius: 3,
  padding: "1px 4px",
  fontFamily: '"gg mono", ui-monospace, Menlo, Consolas, monospace',
  fontSize: "0.9em"
};

const mentionStyle: CSSProperties = {
  backgroundColor: "rgba(88,101,242,0.3)",
  color: "#c9cdfb",
  borderRadius: 3,
  padding: "0 2px",
  fontWeight: 500
};

const blockquoteStyle: CSSProperties = {
  borderLeft: "4px solid #4e5058",
  paddingLeft: 12,
  margin: "2px 0",
  color: discordColors.embedText
};

function emojiUrl(id: string, animated: boolean): string {
  return `https://cdn.discordapp.com/emojis/${id}.${animated ? "gif" : "png"}`;
}

interface InlineRule {
  re: RegExp;
  node: (match: RegExpExecArray, key: string) => ReactNode;
}

// Ordem importa so como desempate quando dois casam no MESMO indice
// (ex.: `***` antes de `**` antes de `*`). Para indices diferentes, vence
// o mais a esquerda.
const INLINE_RULES: InlineRule[] = [
  { re: /\\([*_~`|>\\])/, node: (m) => m[1] },
  {
    re: /`([^`\n]+)`/,
    node: (m, k) => (
      <code key={k} style={codeStyle}>
        {m[1]}
      </code>
    )
  },
  {
    re: /\*\*\*([\s\S]+?)\*\*\*/,
    node: (m, k) => (
      <strong key={k}>
        <em>{renderInline(m[1], `${k}i`)}</em>
      </strong>
    )
  },
  {
    re: /\*\*([\s\S]+?)\*\*/,
    node: (m, k) => <strong key={k}>{renderInline(m[1], `${k}i`)}</strong>
  },
  {
    re: /__([\s\S]+?)__/,
    node: (m, k) => (
      <span key={k} style={{ textDecoration: "underline" }}>
        {renderInline(m[1], `${k}i`)}
      </span>
    )
  },
  {
    re: /~~([\s\S]+?)~~/,
    node: (m, k) => (
      <span key={k} style={{ textDecoration: "line-through" }}>
        {renderInline(m[1], `${k}i`)}
      </span>
    )
  },
  {
    re: /\|\|([\s\S]+?)\|\|/,
    node: (m, k) => (
      <span key={k} style={{ backgroundColor: "#26272b", borderRadius: 3, padding: "0 3px" }}>
        {renderInline(m[1], `${k}i`)}
      </span>
    )
  },
  { re: /\*([^\s*][\s\S]*?)\*/, node: (m, k) => <em key={k}>{renderInline(m[1], `${k}i`)}</em> },
  {
    re: /(?<![A-Za-z0-9])_([^_\n]+)_(?![A-Za-z0-9])/,
    node: (m, k) => <em key={k}>{renderInline(m[1], `${k}i`)}</em>
  },
  {
    re: /\[([^\]\n]+)\]\((https?:\/\/[^)\s]+)\)/,
    node: (m, k) => (
      <a
        key={k}
        href={m[2]}
        target="_blank"
        rel="noreferrer noopener"
        style={{ color: "#00a8fc", textDecoration: "none" }}
      >
        {renderInline(m[1], `${k}i`)}
      </a>
    )
  },
  {
    re: CUSTOM_EMOJI,
    node: (m, k) => (
      <img
        key={k}
        src={emojiUrl(m[3], Boolean(m[1]))}
        alt={`:${m[2]}:`}
        title={`:${m[2]}:`}
        style={{
          height: "1.375em",
          width: "1.375em",
          verticalAlign: "bottom",
          objectFit: "contain",
          display: "inline-block"
        }}
      />
    )
  },
  {
    re: MENTION,
    node: (m, k) => {
      const label = m[1] === "#" ? "#canal" : m[1] === "@&" ? "@cargo" : "@usuário";
      return (
        <span key={k} style={mentionStyle}>
          {label}
        </span>
      );
    }
  },
  {
    re: /(https?:\/\/[^\s<]+)/,
    node: (m, k) => (
      <a
        key={k}
        href={m[1]}
        target="_blank"
        rel="noreferrer noopener"
        style={{ color: "#00a8fc", textDecoration: "none" }}
      >
        {m[1]}
      </a>
    )
  }
];

/** Renderiza formatacao INLINE (sem blocos). Usado tambem para o titulo do container. */
export function renderInline(text: string, keyPrefix = "i"): ReactNode[] {
  const out: ReactNode[] = [];
  let rest = text;
  let guard = 0;

  while (rest.length > 0 && guard++ < 500) {
    let best: { index: number; length: number; node: ReactNode } | null = null;

    for (let i = 0; i < INLINE_RULES.length; i += 1) {
      const rule = INLINE_RULES[i];
      const match = rule.re.exec(rest);
      if (!match) continue;
      if (best === null || match.index < best.index) {
        best = {
          index: match.index,
          length: match[0].length,
          node: rule.node(match, `${keyPrefix}-${out.length}-${i}`)
        };
        if (match.index === 0) break;
      }
    }

    if (best === null) {
      out.push(rest);
      break;
    }

    if (best.index > 0) {
      out.push(rest.slice(0, best.index));
    }
    out.push(best.node);
    rest = rest.slice(best.index + Math.max(best.length, 1));
  }

  return out;
}

const H_STYLES: Record<1 | 2 | 3, CSSProperties> = {
  1: { fontSize: "24px", fontWeight: 700, margin: "8px 0 2px", lineHeight: 1.3 },
  2: { fontSize: "20px", fontWeight: 700, margin: "8px 0 2px", lineHeight: 1.3 },
  3: { fontSize: "16px", fontWeight: 700, margin: "6px 0 2px", lineHeight: 1.3 }
};

/** Renderiza markdown de BLOCO + inline. Retorna uma lista de elementos de bloco. */
export function renderMarkdown(text: string, keyPrefix = "md"): ReactNode {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let paragraph: string[] = [];
  let key = 0;

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    const content = paragraph.join("\n");
    paragraph = [];
    blocks.push(
      <div key={`${keyPrefix}-p-${key++}`} style={{ whiteSpace: "pre-wrap", margin: "2px 0" }}>
        {renderInline(content, `${keyPrefix}-p${key}`)}
      </div>
    );
  };

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];

    // Bloco de codigo cercado por ```
    const fence = /^```(\w*)\s*$/.exec(line);
    if (fence) {
      const body: string[] = [];
      i += 1;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) {
        body.push(lines[i]);
        i += 1;
      }
      flushParagraph();
      blocks.push(
        <pre
          key={`${keyPrefix}-code-${key++}`}
          style={{
            backgroundColor: "#1e1f22",
            borderRadius: 4,
            padding: "8px 10px",
            margin: "4px 0",
            fontFamily: '"gg mono", ui-monospace, Menlo, Consolas, monospace',
            fontSize: "13px",
            whiteSpace: "pre",
            overflowX: "auto"
          }}
        >
          {body.join("\n")}
        </pre>
      );
      continue;
    }

    // Citacao multi-linha `>>> ` — consome ate o fim.
    if (/^>>> /.test(line)) {
      flushParagraph();
      const quoted = [line.slice(4), ...lines.slice(i + 1)].join("\n");
      i = lines.length;
      blocks.push(
        <blockquote key={`${keyPrefix}-bq-${key++}`} style={blockquoteStyle}>
          {renderMarkdown(quoted, `${keyPrefix}-bq${key}`)}
        </blockquote>
      );
      continue;
    }

    // Citacao linha a linha `> ` — agrupa consecutivas.
    if (/^> ?/.test(line) && /^>/.test(line)) {
      flushParagraph();
      const quotedLines: string[] = [];
      while (i < lines.length && /^>/.test(lines[i])) {
        quotedLines.push(lines[i].replace(/^> ?/, ""));
        i += 1;
      }
      i -= 1;
      blocks.push(
        <blockquote key={`${keyPrefix}-bq-${key++}`} style={blockquoteStyle}>
          {renderMarkdown(quotedLines.join("\n"), `${keyPrefix}-bq${key}`)}
        </blockquote>
      );
      continue;
    }

    // Texto pequeno `-# `
    const subtext = /^-# (.*)$/.exec(line);
    if (subtext) {
      flushParagraph();
      blocks.push(
        <div
          key={`${keyPrefix}-sub-${key++}`}
          style={{ fontSize: "12.5px", color: discordColors.ephemeralFooter, margin: "2px 0" }}
        >
          {renderInline(subtext[1], `${keyPrefix}-sub${key}`)}
        </div>
      );
      continue;
    }

    // Titulos `# ` `## ` `### `
    const heading = /^(#{1,3}) (.*)$/.exec(line);
    if (heading) {
      flushParagraph();
      const level = heading[1].length as 1 | 2 | 3;
      blocks.push(
        <div
          key={`${keyPrefix}-h-${key++}`}
          style={{ ...H_STYLES[level], color: discordColors.embedTitle }}
        >
          {renderInline(heading[2], `${keyPrefix}-h${key}`)}
        </div>
      );
      continue;
    }

    // Listas
    const bullet = /^ *[-*+] (.*)$/.exec(line);
    const ordered = /^ *\d+\. (.*)$/.exec(line);
    if (bullet || ordered) {
      flushParagraph();
      const items: ReactNode[] = [];
      const isOrdered = Boolean(ordered);
      while (i < lines.length) {
        const b = /^ *[-*+] (.*)$/.exec(lines[i]);
        const o = /^ *\d+\. (.*)$/.exec(lines[i]);
        if (!b && !o) break;
        const inner = (b ?? o)![1];
        items.push(
          <li key={`li-${items.length}`}>
            {renderInline(inner, `${keyPrefix}-li${key}-${items.length}`)}
          </li>
        );
        i += 1;
      }
      i -= 1;
      const listStyle: CSSProperties = { margin: "2px 0", paddingLeft: 22 };
      blocks.push(
        isOrdered ? (
          <ol key={`${keyPrefix}-list-${key++}`} style={listStyle}>
            {items}
          </ol>
        ) : (
          <ul key={`${keyPrefix}-list-${key++}`} style={listStyle}>
            {items}
          </ul>
        )
      );
      continue;
    }

    if (line.trim() === "") {
      flushParagraph();
      continue;
    }

    paragraph.push(line);
  }

  flushParagraph();
  return blocks;
}

/**
 * Versao "1 linha" para cartoes/listas: tira os marcadores de bloco
 * (`# `, `> `, `-# `, `- `, `[x](url)` -> `x`) e renderiza so o inline
 * (negrito/italico/emoji). Nao produz blocos.
 */
export function renderInlineCompact(text: string, keyPrefix = "ic"): ReactNode[] {
  const cleaned = text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.replace(/^\s*(?:#{1,3} |-# |>+ ?|[-*+] |\d+\.\s)/, ""))
    .join(" ")
    .replace(/\[([^\]\n]+)\]\((https?:\/\/[^)\s]+)\)/g, "$1");
  return renderInline(cleaned, keyPrefix);
}
