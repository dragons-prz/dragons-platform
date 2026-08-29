import type {
  RecruitmentAvatarPlacement,
  RecruitmentButtonConfig,
  RecruitmentMessageConfig
} from "@dragons/shared";

import { buttonStyleColors, discordColors, discordFontFamily } from "../discord-preview/colors";
import { renderButtonEmoji } from "../discord-preview/emoji";
import { renderInline, renderMarkdown } from "../discord-preview/markdown";
import { applyTemplate } from "./preview-data";

const PREVIEW_MAX_WIDTH = "min(32rem, 100%)";

/** Avatar ficticio do "recrutado" na previa (o Discord serve os defaults nesse caminho). */
const SAMPLE_AVATAR = "https://cdn.discordapp.com/embed/avatars/3.png";

export interface PreviewSelect {
  placeholder: string;
  options: { id: string; label: string; description: string | null; emoji: string | null }[];
}

/**
 * Previa fiel de uma mensagem do fluxo, nos dois layouts. Espelha o que o
 * bot monta em `recruitment/message.ts`: no container a imagem e um banner
 * (ou a foto do recrutado vira thumbnail a direita) e o titulo e markdown;
 * no embed a imagem fica embaixo e a foto e a thumbnail nativa.
 */
export function RecruitmentMessagePreview({
  message,
  vars,
  buttons,
  select,
  avatarPlacement = "none"
}: {
  message: RecruitmentMessageConfig;
  vars: Record<string, string>;
  buttons?: RecruitmentButtonConfig[];
  select?: PreviewSelect;
  avatarPlacement?: RecruitmentAvatarPlacement;
}) {
  const isContainer = message.layout === "container";
  const showThumbnail = avatarPlacement === "thumbnail";
  const bannerUrl = message.imageUrl ?? (avatarPlacement === "image" ? SAMPLE_AVATAR : null);
  const title = applyTemplate(message.title, vars);
  const description = applyTemplate(message.description, vars);

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
            backgroundColor: message.color ?? discordColors.embedAccentDefault
          }}
        />
        <div
          className="flex flex-1 flex-col gap-2"
          style={{
            backgroundColor: discordColors.embedSurface,
            padding: isContainer ? 0 : 16,
            color: discordColors.embedText,
            fontSize: "15px",
            lineHeight: 1.45,
            overflowWrap: "anywhere"
          }}
        >
          {isContainer && bannerUrl ? (
            <img src={bannerUrl} alt="" style={{ width: "100%", display: "block" }} />
          ) : null}

          <div
            className="flex gap-3"
            style={{ padding: isContainer ? "12px 16px" : 0, alignItems: "flex-start" }}
          >
            <div className="flex flex-1 flex-col gap-1">
              <div
                style={{
                  color: discordColors.embedTitle,
                  fontWeight: 700,
                  fontSize: isContainer ? "20px" : "16px",
                  lineHeight: 1.3
                }}
              >
                {isContainer ? renderInline(title, "rec-title") : title}
              </div>
              <div>{renderMarkdown(description, "rec-desc")}</div>
              {!isContainer && bannerUrl ? (
                <img
                  src={bannerUrl}
                  alt=""
                  className="mt-1 rounded"
                  style={{ maxWidth: "100%", display: "block" }}
                />
              ) : null}
            </div>

            {showThumbnail ? (
              <img
                src={SAMPLE_AVATAR}
                alt="Foto do recrutado"
                style={{ width: 72, height: 72, borderRadius: 8, flexShrink: 0 }}
              />
            ) : null}
          </div>
        </div>
      </div>

      {select ? <SelectPreview select={select} /> : null}

      {buttons && buttons.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {buttons.map((button, index) => (
            <PreviewButton key={index} button={button} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function SelectPreview({ select }: { select: PreviewSelect }) {
  return (
    <div className="mt-3" style={{ maxWidth: PREVIEW_MAX_WIDTH }}>
      <div
        style={{
          padding: "10px 12px",
          borderRadius: 4,
          border: `1px solid ${discordColors.embedAccentDefault}`,
          backgroundColor: discordColors.messageSurface,
          color: discordColors.embedText,
          fontSize: "14px"
        }}
      >
        {select.placeholder || "Selecione uma opção"}
        <span style={{ float: "right", opacity: 0.6 }}>▼</span>
      </div>
      {select.options.length > 0 ? (
        <div
          className="mt-1 flex flex-col"
          style={{
            borderRadius: 4,
            border: `1px solid ${discordColors.embedAccentDefault}`,
            backgroundColor: discordColors.embedSurface,
            overflow: "hidden"
          }}
        >
          {select.options.map((option) => (
            <div
              key={option.id}
              style={{
                padding: "8px 12px",
                borderTop: `1px solid ${discordColors.messageSurface}`
              }}
            >
              <div style={{ color: discordColors.embedTitle, fontSize: "14px", fontWeight: 600 }}>
                {option.emoji ? <span>{renderButtonEmoji(option.emoji)} </span> : null}
                {option.label || "sem nome"}
              </div>
              {option.description ? (
                <div style={{ color: discordColors.embedText, fontSize: "12px" }}>
                  {option.description}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-1 font-body text-xs text-warn">
          Nenhuma opção cadastrada — o dropdown ficaria vazio e o comando não roda.
        </p>
      )}
    </div>
  );
}

function PreviewButton({ button }: { button: RecruitmentButtonConfig }) {
  const { background } = buttonStyleColors[button.style];
  return (
    <span
      style={{
        height: 32,
        padding: "0 16px",
        borderRadius: 3,
        backgroundColor: background,
        color: discordColors.buttonText,
        fontFamily: discordFontFamily,
        fontSize: "14px",
        fontWeight: 500,
        display: "inline-flex",
        alignItems: "center",
        gap: 8
      }}
    >
      {button.emoji ? <span>{renderButtonEmoji(button.emoji)}</span> : null}
      {button.label ? <span>{button.label}</span> : null}
    </span>
  );
}
