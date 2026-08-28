import type { PanelActionConfig, SupportCategoryConfig } from "@dragons/shared";
import {
  HEX_COLOR_PATTERN,
  PANEL_ACTIONS,
  PANEL_LIMITS,
  validateColor,
  validateImageUrl
} from "@dragons/shared";
import type { ReactNode } from "react";
import { useId, useRef } from "react";

import { CharacterCounter } from "./CharacterCounter";
import { ColorField } from "./ColorField";
import { EmojiPicker } from "./EmojiPicker";
import { ImageUrlField } from "./ImageUrlField";
import { useCursorInsert } from "./useCursorInsert";

interface ActionEditorProps {
  action: PanelActionConfig;
  onChange: (next: PanelActionConfig) => void;
  /** Categorias de suporte para o parametro `support-category-ref`. */
  categories: SupportCategoryConfig[];
}

/**
 * Editor da acao de um botao/opcao de painel: "Responder com mensagem"
 * (embed efemero — comportamento historico) ou "Executar acao" (dispara uma
 * acao registrada no bot, ex.: abrir ticket de suporte).
 */
export function ActionEditor({ action, onChange, categories }: ActionEditorProps) {
  const fieldId = useId();
  const responseRef = useRef<HTMLTextAreaElement>(null);

  const replyResponse = action.type === "reply" ? action.response : "";
  const insertIntoResponse = useCursorInsert(responseRef, replyResponse, (next) => {
    if (action.type === "reply") onChange({ ...action, response: next });
  });

  function selectType(type: "reply" | "run") {
    if (type === action.type) return;
    if (type === "reply") {
      onChange({ type: "reply", response: "", responseImageUrl: null, responseColor: null });
    } else {
      const first = PANEL_ACTIONS[0];
      onChange({ type: "run", actionId: first?.id ?? "", params: {} });
    }
  }

  return (
    <div className="flex flex-col gap-3 border-t border-line pt-3">
      <span className="font-body text-xs font-medium text-ink-muted">Ao acionar</span>

      <div className="flex flex-wrap gap-2">
        <TypeChip active={action.type === "reply"} onClick={() => selectType("reply")}>
          Responder com mensagem
        </TypeChip>
        <TypeChip active={action.type === "run"} onClick={() => selectType("run")}>
          Executar ação
        </TypeChip>
      </div>

      {action.type === "reply" ? (
        <>
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <label
                htmlFor={`${fieldId}-response`}
                className="font-body text-xs font-medium text-ink-muted"
              >
                Mensagem efêmera (só quem clicou vê)
              </label>
              <CharacterCounter
                current={action.response.length}
                max={PANEL_LIMITS.BUTTON_RESPONSE_MAX}
              />
            </div>
            <div className="flex items-start gap-2">
              <textarea
                id={`${fieldId}-response`}
                ref={responseRef}
                value={action.response}
                onChange={(event) => onChange({ ...action, response: event.target.value })}
                rows={3}
                className="flex-1 resize-y rounded-lg border border-line bg-ground px-3 py-2 font-body text-sm text-ink outline-none focus-visible:border-ember"
              />
              <EmojiPicker onSelect={insertIntoResponse} label="Inserir emoji na resposta" />
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
            <div className="flex-1">
              <ImageUrlField
                label="Imagem da resposta (opcional)"
                value={action.responseImageUrl ?? ""}
                onChange={(next) => onChange({ ...action, responseImageUrl: next || null })}
                error={action.responseImageUrl ? validateImageUrl(action.responseImageUrl) : null}
              />
            </div>
            <div className="flex-1">
              <ColorField
                label="Cor da resposta (opcional)"
                value={action.responseColor ?? ""}
                onChange={(next) => onChange({ ...action, responseColor: next || null })}
                error={
                  action.responseColor && !HEX_COLOR_PATTERN.test(action.responseColor)
                    ? validateColor(action.responseColor)
                    : null
                }
              />
            </div>
          </div>
        </>
      ) : (
        <RunActionFields
          action={action}
          onChange={onChange}
          categories={categories}
          fieldId={fieldId}
        />
      )}
    </div>
  );
}

function RunActionFields({
  action,
  onChange,
  categories,
  fieldId
}: {
  action: Extract<PanelActionConfig, { type: "run" }>;
  onChange: (next: PanelActionConfig) => void;
  categories: SupportCategoryConfig[];
  fieldId: string;
}) {
  const spec = PANEL_ACTIONS.find((entry) => entry.id === action.actionId);

  function setParam(key: string, value: string) {
    onChange({ ...action, params: { ...action.params, [key]: value } });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label
          htmlFor={`${fieldId}-actionId`}
          className="font-body text-xs font-medium text-ink-muted"
        >
          Ação
        </label>
        <select
          id={`${fieldId}-actionId`}
          value={action.actionId}
          onChange={(event) => onChange({ type: "run", actionId: event.target.value, params: {} })}
          className="rounded-lg border border-line bg-ground px-3 py-2 font-body text-sm text-ink outline-none focus-visible:border-ember"
        >
          {PANEL_ACTIONS.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.label}
            </option>
          ))}
        </select>
        {spec ? <p className="font-body text-xs text-ink-muted">{spec.description}</p> : null}
      </div>

      {spec?.params.map((param) => {
        const value = action.params[param.key] ?? "";
        if (param.kind === "support-category-ref") {
          return (
            <div key={param.key} className="flex flex-col gap-1">
              <label
                htmlFor={`${fieldId}-${param.key}`}
                className="font-body text-xs font-medium text-ink-muted"
              >
                {param.label}
                {param.required ? " *" : ""}
              </label>
              <select
                id={`${fieldId}-${param.key}`}
                value={value}
                onChange={(event) => setParam(param.key, event.target.value)}
                className="rounded-lg border border-line bg-ground px-3 py-2 font-body text-sm text-ink outline-none focus-visible:border-ember"
              >
                <option value="">Selecione uma categoria…</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name} ({category.id})
                  </option>
                ))}
              </select>
              {categories.length === 0 ? (
                <p className="font-body text-xs text-warn">
                  Nenhuma categoria de suporte criada ainda. Crie uma na aba "Suporte".
                </p>
              ) : null}
              {param.help ? <p className="font-body text-xs text-ink-muted">{param.help}</p> : null}
            </div>
          );
        }
        return (
          <div key={param.key} className="flex flex-col gap-1">
            <label
              htmlFor={`${fieldId}-${param.key}`}
              className="font-body text-xs font-medium text-ink-muted"
            >
              {param.label}
              {param.required ? " *" : ""}
            </label>
            <input
              id={`${fieldId}-${param.key}`}
              type="text"
              value={value}
              onChange={(event) => setParam(param.key, event.target.value)}
              className="rounded-lg border border-line bg-ground px-3 py-2 font-body text-sm text-ink outline-none focus-visible:border-ember"
            />
          </div>
        );
      })}
    </div>
  );
}

function TypeChip({
  active,
  onClick,
  children
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-lg border px-3 py-1.5 font-display text-xs font-semibold transition-colors ${
        active
          ? "border-ember bg-ember/10 text-ember"
          : "border-line text-ink-muted hover:border-ember/60 hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}
