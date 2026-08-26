import type { PanelButtonConfig, PanelConfig } from "@dragons/shared";
import { useState } from "react";

import { buttonStyleColors, discordColors, discordFontFamily } from "./colors";
import { renderButtonEmoji, renderDiscordText } from "./emoji";

const MAX_BUTTONS_PER_ROW = 5;
const MAX_ROWS = 5;
const MAX_BUTTONS_TOTAL = MAX_BUTTONS_PER_ROW * MAX_ROWS;

/** Agrupa os botoes (ja ordenados por `order`) em linhas de ate 5, no maximo 5 linhas — regra imposta pelo proprio Discord. */
function chunkIntoRows(buttons: PanelButtonConfig[]): PanelButtonConfig[][] {
  const limited = buttons.slice(0, MAX_BUTTONS_TOTAL);
  const rows: PanelButtonConfig[][] = [];
  for (let i = 0; i < limited.length; i += MAX_BUTTONS_PER_ROW) {
    rows.push(limited.slice(i, i + MAX_BUTTONS_PER_ROW));
  }
  return rows;
}

/**
 * Pre-visualizacao fiel de um painel (embed + botoes) como apareceria no
 * Discord. Cores/tipografia sao literais de `discord-preview/colors.ts` —
 * nunca os tokens do painel. Clicar num botao mostra abaixo a
 * pre-visualizacao da resposta efemera que o membro receberia, agora
 * tambem como um embed (barra lateral colorida + imagem opcional).
 *
 * `panel.color` (e `button.responseColor` na resposta efemera) definem a
 * cor real da barra lateral do embed, exatamente como o bot passa a fazer
 * via `.setColor()`. Sem cor definida, a barra usa o mesmo neutro
 * (`embedAccentDefault`) que o proprio Discord desenha para qualquer embed
 * sem cor customizada.
 */
export function DiscordPanelPreview({ panel }: { panel: PanelConfig }) {
  const [activeButtonId, setActiveButtonId] = useState<string | null>(null);
  const rows = chunkIntoRows(panel.buttons);
  const activeButton = panel.buttons.find((button) => button.id === activeButtonId) ?? null;

  return (
    <div
      className="rounded-lg p-4"
      style={{ backgroundColor: discordColors.messageSurface, fontFamily: discordFontFamily }}
    >
      <div className="flex overflow-hidden rounded" style={{ maxWidth: "26rem" }}>
        <div
          style={{
            width: 4,
            flexShrink: 0,
            backgroundColor: panel.color ?? discordColors.embedAccentDefault
          }}
        />
        <div
          className="flex flex-1 flex-col gap-2 p-4"
          style={{ backgroundColor: discordColors.embedSurface }}
        >
          <h3
            style={{
              color: discordColors.embedTitle,
              fontWeight: 700,
              fontSize: "16px",
              margin: 0,
              lineHeight: 1.3
            }}
          >
            {renderDiscordText(panel.title)}
          </h3>

          <p
            style={{
              color: discordColors.embedText,
              fontSize: "14px",
              lineHeight: 1.45,
              margin: 0,
              whiteSpace: "pre-wrap",
              overflowWrap: "anywhere"
            }}
          >
            {renderDiscordText(panel.description)}
          </p>

          {panel.imageUrl ? (
            <img
              src={panel.imageUrl}
              alt=""
              className="mt-1 rounded"
              style={{ maxWidth: "100%", display: "block" }}
            />
          ) : null}
        </div>
      </div>

      {rows.length > 0 ? (
        <div className="mt-3 flex flex-col gap-2">
          {rows.map((row, rowIndex) => (
            <div key={rowIndex} className="flex flex-wrap gap-2">
              {row.map((button) => (
                <PreviewButton
                  key={button.id}
                  button={button}
                  isActive={button.id === activeButtonId}
                  onClick={() =>
                    setActiveButtonId((current) => (current === button.id ? null : button.id))
                  }
                />
              ))}
            </div>
          ))}
        </div>
      ) : null}

      {panel.buttons.length > MAX_BUTTONS_TOTAL ? (
        <p className="mt-2 font-body text-xs text-danger">
          Este painel tem {panel.buttons.length} botoes, mas o Discord permite no maximo{" "}
          {MAX_BUTTONS_TOTAL} (5 por linha, 5 linhas). Os excedentes nao seriam publicados.
        </p>
      ) : null}

      {activeButton ? <EphemeralResponsePreview button={activeButton} /> : null}
    </div>
  );
}

function PreviewButton({
  button,
  isActive,
  onClick
}: {
  button: PanelButtonConfig;
  isActive: boolean;
  onClick: () => void;
}) {
  const { background, hover } = buttonStyleColors[button.style];

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      title="Clique para pre-visualizar a resposta efemera deste botao"
      style={{
        height: 32,
        padding: "0 16px",
        borderRadius: 3,
        border: isActive ? `2px solid ${discordColors.embedTitle}` : "none",
        backgroundColor: isActive ? hover : background,
        color: discordColors.buttonText,
        fontFamily: discordFontFamily,
        fontSize: "14px",
        fontWeight: 500,
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        cursor: "pointer"
      }}
      onMouseEnter={(event) => {
        if (!isActive) event.currentTarget.style.backgroundColor = hover;
      }}
      onMouseLeave={(event) => {
        if (!isActive) event.currentTarget.style.backgroundColor = background;
      }}
    >
      {button.emoji ? <span>{renderButtonEmoji(button.emoji)}</span> : null}
      <span>{button.label}</span>
    </button>
  );
}

/**
 * Pre-visualizacao da mensagem efemera ("Só você pode ver esta mensagem")
 * que o membro receberia ao clicar num botao. O bot responde com um embed
 * de verdade (descricao = `response`, imagem e cor opcionais) — por isso o
 * preview e um mini-embed com a mesma estrutura visual do embed principal
 * (barra lateral + imagem abaixo do texto), nao so um bloco de texto solto.
 */
function EphemeralResponsePreview({ button }: { button: PanelButtonConfig }) {
  return (
    <div
      className="mt-3 rounded-lg p-3"
      style={{ backgroundColor: discordColors.ephemeralSurface, fontFamily: discordFontFamily }}
    >
      <div className="flex overflow-hidden rounded" style={{ maxWidth: "26rem" }}>
        <div
          style={{
            width: 4,
            flexShrink: 0,
            backgroundColor: button.responseColor ?? discordColors.embedAccentDefault
          }}
        />
        <div
          className="flex flex-1 flex-col gap-2 p-3"
          style={{ backgroundColor: discordColors.embedSurface }}
        >
          <p
            style={{
              color: discordColors.embedText,
              fontSize: "14px",
              lineHeight: 1.45,
              margin: 0,
              whiteSpace: "pre-wrap",
              overflowWrap: "anywhere"
            }}
          >
            {renderDiscordText(button.response)}
          </p>

          {button.responseImageUrl ? (
            <img
              src={button.responseImageUrl}
              alt=""
              className="mt-1 rounded"
              style={{ maxWidth: "100%", display: "block" }}
            />
          ) : null}
        </div>
      </div>
      <p style={{ color: discordColors.ephemeralFooter, fontSize: "12px", margin: "6px 0 0" }}>
        Só você pode ver esta mensagem
      </p>
    </div>
  );
}
