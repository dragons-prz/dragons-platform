import type {
  PanelActionConfig,
  PanelButtonConfig,
  PanelConfig,
  PanelSelectOption
} from "@dragons/shared";
import { getPanelActionSpec } from "@dragons/shared";
import { useState } from "react";

import { buttonStyleColors, discordColors, discordFontFamily } from "./colors";
import { renderButtonEmoji, renderDiscordText } from "./emoji";
import { renderInline, renderMarkdown } from "./markdown";

const PREVIEW_MAX_WIDTH = "32rem";

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
  const rows = panel.kind === "select" ? [] : chunkIntoRows(panel.buttons);
  const activeButton = panel.buttons.find((button) => button.id === activeButtonId) ?? null;

  return (
    <div
      className="rounded-lg p-4"
      style={{ backgroundColor: discordColors.messageSurface, fontFamily: discordFontFamily }}
    >
      <div className="flex overflow-hidden rounded" style={{ maxWidth: PREVIEW_MAX_WIDTH }}>
        <div
          style={{
            width: 4,
            flexShrink: 0,
            backgroundColor: panel.color ?? discordColors.embedAccentDefault
          }}
        />
        <div
          className="flex flex-1 flex-col gap-2"
          style={{
            backgroundColor: discordColors.embedSurface,
            padding: panel.layout === "container" ? 0 : 16,
            color: discordColors.embedText,
            fontSize: "15px",
            lineHeight: 1.45,
            overflowWrap: "anywhere"
          }}
        >
          {panel.layout === "container" && panel.imageUrl ? (
            <img src={panel.imageUrl} alt="" style={{ width: "100%", display: "block" }} />
          ) : null}

          <div
            className="flex flex-col gap-1"
            style={{ padding: panel.layout === "container" ? "12px 16px" : 0 }}
          >
            <div
              style={{
                color: discordColors.embedTitle,
                fontWeight: 700,
                fontSize: panel.layout === "container" ? "20px" : "16px",
                lineHeight: 1.3
              }}
            >
              {panel.layout === "container"
                ? renderInline(panel.title, "title")
                : renderDiscordText(panel.title)}
            </div>

            <div>{renderMarkdown(panel.description, "desc")}</div>

            {panel.layout !== "container" && panel.imageUrl ? (
              <img
                src={panel.imageUrl}
                alt=""
                className="mt-1 rounded"
                style={{ maxWidth: "100%", display: "block" }}
              />
            ) : null}
          </div>
        </div>
      </div>

      {panel.kind === "select" && panel.select ? (
        <SelectPreview placeholder={panel.select.placeholder} options={panel.select.options} />
      ) : null}

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

/** Descreve o que uma acao faz, para o preview do dropdown. */
function describeAction(action: PanelActionConfig): string {
  if (action.type === "reply") return "Responde com uma mensagem efêmera";
  const spec = getPanelActionSpec(action.actionId);
  const suffix = action.params?.category ? ` (${action.params.category})` : "";
  return `Ação: ${spec?.label ?? action.actionId}${suffix}`;
}

/** Previa aproximada de um menu suspenso (string select) do Discord. */
function SelectPreview({
  placeholder,
  options
}: {
  placeholder: string;
  options: PanelSelectOption[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-3" style={{ maxWidth: PREVIEW_MAX_WIDTH }}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        style={{
          width: "100%",
          textAlign: "left",
          padding: "10px 12px",
          borderRadius: 4,
          border: `1px solid ${discordColors.embedAccentDefault}`,
          backgroundColor: discordColors.messageSurface,
          color: discordColors.embedText,
          fontFamily: discordFontFamily,
          fontSize: "14px",
          cursor: "pointer"
        }}
      >
        {placeholder || "Selecione uma opção"}
        <span style={{ float: "right", opacity: 0.6 }}>{open ? "▲" : "▼"}</span>
      </button>

      {open ? (
        <div
          className="mt-1 flex flex-col"
          style={{
            borderRadius: 4,
            border: `1px solid ${discordColors.embedAccentDefault}`,
            backgroundColor: discordColors.embedSurface,
            overflow: "hidden"
          }}
        >
          {options.length === 0 ? (
            <span
              style={{
                padding: "10px 12px",
                color: discordColors.embedText,
                fontFamily: discordFontFamily,
                fontSize: "13px",
                opacity: 0.7
              }}
            >
              Nenhuma opção ainda.
            </span>
          ) : (
            options.map((option) => (
              <div
                key={option.id}
                style={{
                  padding: "8px 12px",
                  borderTop: `1px solid ${discordColors.messageSurface}`,
                  fontFamily: discordFontFamily
                }}
              >
                <div style={{ color: discordColors.embedTitle, fontSize: "14px", fontWeight: 600 }}>
                  {option.emoji ? <span>{renderButtonEmoji(option.emoji)} </span> : null}
                  {option.label || "sem texto"}
                </div>
                {option.description ? (
                  <div style={{ color: discordColors.embedText, fontSize: "12px" }}>
                    {option.description}
                  </div>
                ) : null}
                <div
                  style={{ color: discordColors.ephemeralFooter, fontSize: "11px", marginTop: 2 }}
                >
                  {describeAction(option.action)}
                </div>
              </div>
            ))
          )}
        </div>
      ) : null}
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
      <div className="flex overflow-hidden rounded" style={{ maxWidth: PREVIEW_MAX_WIDTH }}>
        <div
          style={{
            width: 4,
            flexShrink: 0,
            backgroundColor: button.responseColor ?? discordColors.embedAccentDefault
          }}
        />
        <div
          className="flex flex-1 flex-col gap-2 p-3"
          style={{
            backgroundColor: discordColors.embedSurface,
            color: discordColors.embedText,
            fontSize: "15px",
            lineHeight: 1.45,
            overflowWrap: "anywhere"
          }}
        >
          <div>{renderMarkdown(button.response, "eph")}</div>

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
