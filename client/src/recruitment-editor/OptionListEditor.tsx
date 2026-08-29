import type {
  DiscordRoleSummary,
  RecruitmentAreaOption,
  RecruitmentStarterRoleOption
} from "@dragons/shared";
import {
  RECRUITMENT_AREA_SEED,
  RECRUITMENT_LIMITS,
  RECRUITMENT_STARTER_ROLE_SEED,
  SELECT_LIMITS,
  slugify
} from "@dragons/shared";
import type { ReactNode } from "react";

import { renderButtonEmoji } from "../discord-preview/emoji";
import { ArrowDownIcon, ArrowUpIcon, PlusIcon, TrashIcon } from "../components/icons";
import { EmojiPicker } from "../panel-editor/EmojiPicker";

const INPUT_CLASS =
  "rounded-lg border border-line bg-surface px-3 py-2 font-body text-sm text-ink outline-none focus-visible:border-ember";

/** Gera um id de opcao unico a partir do nome digitado. */
function nextOptionId(label: string, taken: readonly string[]): string {
  const base = slugify(label) || "opcao";
  if (!taken.includes(base)) return base;
  for (let suffix = 2; suffix < 100; suffix += 1) {
    const candidate = `${base}-${suffix}`;
    if (!taken.includes(candidate)) return candidate;
  }
  return `${base}-${Date.now()}`;
}

function move<T extends { order: number }>(list: T[], index: number, delta: number): T[] {
  const target = index + delta;
  if (target < 0 || target >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(index, 1);
  next.splice(target, 0, item);
  return next.map((entry, position) => ({ ...entry, order: position }));
}

/** Moldura comum das duas listas: nome, descricao, emoji e os controles de ordem/remocao. */
function OptionCard({
  option,
  index,
  total,
  onChange,
  onMove,
  onRemove,
  children
}: {
  option: { id: string; label: string; description: string | null; emoji: string | null };
  index: number;
  total: number;
  onChange: (patch: { label?: string; description?: string | null; emoji?: string | null }) => void;
  onMove: (delta: number) => void;
  onRemove: () => void;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-line bg-ground p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-xs text-ink-muted">{option.id}</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onMove(-1)}
            disabled={index === 0}
            title="Mover para cima"
            className="rounded p-1 text-ink-muted transition-colors hover:text-ink disabled:opacity-30"
          >
            <ArrowUpIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onMove(1)}
            disabled={index === total - 1}
            title="Mover para baixo"
            className="rounded p-1 text-ink-muted transition-colors hover:text-ink disabled:opacity-30"
          >
            <ArrowDownIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onRemove}
            title="Remover"
            className="rounded p-1 text-ink-muted transition-colors hover:text-danger"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={option.label}
          maxLength={SELECT_LIMITS.OPTION_LABEL_MAX}
          placeholder="Nome mostrado no dropdown"
          onChange={(event) => onChange({ label: event.target.value })}
          className={`min-w-40 flex-1 ${INPUT_CLASS}`}
        />
        {option.emoji ? (
          <button
            type="button"
            onClick={() => onChange({ emoji: null })}
            title="Remover emoji"
            className="flex h-9 items-center gap-1 rounded-lg border border-line px-2 font-body text-sm text-ink transition-colors hover:border-danger hover:text-danger"
          >
            {renderButtonEmoji(option.emoji)}
            <span className="text-xs">×</span>
          </button>
        ) : null}
        <EmojiPicker
          label={`Emoji da opção ${option.label || option.id}`}
          onSelect={(emoji) => onChange({ emoji })}
        />
      </div>

      <input
        type="text"
        value={option.description ?? ""}
        maxLength={SELECT_LIMITS.OPTION_DESCRIPTION_MAX}
        placeholder="Descrição (opcional, aparece abaixo do nome no dropdown)"
        onChange={(event) =>
          onChange({ description: event.target.value.trim() === "" ? null : event.target.value })
        }
        className={INPUT_CLASS}
      />

      {children}
    </div>
  );
}

function AddButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-fit items-center gap-2 rounded-lg border border-line px-3 py-2 font-display text-sm font-medium text-ink-muted transition-colors hover:border-ink-muted hover:text-ink"
    >
      <PlusIcon className="h-4 w-4" />
      {label}
    </button>
  );
}

function SeedButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-fit rounded-lg border border-line px-3 py-2 font-display text-sm font-medium text-ink-muted transition-colors hover:border-ink-muted hover:text-ink"
    >
      Preencher com o padrão
    </button>
  );
}

/** Lista das opcoes da etapa 1 — cada uma aplica UM cargo. */
export function StarterRoleListEditor({
  options,
  roles,
  onChange
}: {
  options: RecruitmentStarterRoleOption[];
  roles: DiscordRoleSummary[];
  onChange: (next: RecruitmentStarterRoleOption[]) => void;
}) {
  const ids = options.map((option) => option.id);

  function add(label: string) {
    if (options.length >= RECRUITMENT_LIMITS.MAX_OPTIONS) return;
    onChange([
      ...options,
      {
        id: nextOptionId(label, ids),
        label,
        description: null,
        emoji: null,
        roleId: "",
        order: options.length
      }
    ]);
  }

  return (
    <div className="flex flex-col gap-3">
      {options.map((option, index) => (
        <OptionCard
          key={option.id}
          option={option}
          index={index}
          total={options.length}
          onChange={(patch) =>
            onChange(options.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)))
          }
          onMove={(delta) => onChange(move(options, index, delta))}
          onRemove={() =>
            onChange(
              options
                .filter((_, i) => i !== index)
                .map((entry, position) => ({ ...entry, order: position }))
            )
          }
        >
          <label className="flex flex-col gap-1">
            <span className="font-body text-xs font-medium text-ink-muted">
              Cargo aplicado ao recrutado
            </span>
            <select
              value={option.roleId}
              onChange={(event) =>
                onChange(
                  options.map((entry, i) =>
                    i === index ? { ...entry, roleId: event.target.value } : entry
                  )
                )
              }
              className={INPUT_CLASS}
            >
              <option value="">Selecione o cargo...</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  @{role.name}
                </option>
              ))}
            </select>
          </label>
        </OptionCard>
      ))}

      <div className="flex flex-wrap gap-2">
        <AddButton onClick={() => add("Novo cargo")} label="Adicionar cargo de iniciante" />
        {options.length === 0 ? (
          <SeedButton
            onClick={() =>
              onChange(
                RECRUITMENT_STARTER_ROLE_SEED.map((label, index) => ({
                  id: slugify(label),
                  label,
                  description: null,
                  emoji: null,
                  roleId: "",
                  order: index
                }))
              )
            }
          />
        ) : null}
      </div>
    </div>
  );
}

/** Lista das opcoes da etapa 2 — cada uma aplica 1..n cargos e vale pontos. */
export function AreaListEditor({
  options,
  roles,
  onChange
}: {
  options: RecruitmentAreaOption[];
  roles: DiscordRoleSummary[];
  onChange: (next: RecruitmentAreaOption[]) => void;
}) {
  const ids = options.map((option) => option.id);

  function add(label: string, points: number) {
    if (options.length >= RECRUITMENT_LIMITS.MAX_OPTIONS) return;
    onChange([
      ...options,
      {
        id: nextOptionId(label, ids),
        label,
        description: null,
        emoji: null,
        roleIds: [],
        points,
        order: options.length
      }
    ]);
  }

  function patchAt(index: number, patch: Partial<RecruitmentAreaOption>) {
    onChange(options.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)));
  }

  return (
    <div className="flex flex-col gap-3">
      {options.map((option, index) => (
        <OptionCard
          key={option.id}
          option={option}
          index={index}
          total={options.length}
          onChange={(patch) => patchAt(index, patch)}
          onMove={(delta) => onChange(move(options, index, delta))}
          onRemove={() =>
            onChange(
              options
                .filter((_, i) => i !== index)
                .map((entry, position) => ({ ...entry, order: position }))
            )
          }
        >
          <div className="flex flex-col gap-1">
            <span className="font-body text-xs font-medium text-ink-muted">
              Cargos aplicados ao recrutado ({option.roleIds.length})
            </span>
            <div className="flex max-h-40 flex-col gap-1 overflow-y-auto rounded-lg border border-line bg-surface p-2">
              {roles.map((role) => (
                <label key={role.id} className="flex items-center gap-2 font-body text-sm text-ink">
                  <input
                    type="checkbox"
                    checked={option.roleIds.includes(role.id)}
                    onChange={() => {
                      const set = new Set(option.roleIds);
                      if (set.has(role.id)) set.delete(role.id);
                      else set.add(role.id);
                      patchAt(index, { roleIds: [...set] });
                    }}
                  />
                  @{role.name}
                </label>
              ))}
            </div>
          </div>

          <label className="flex flex-col gap-1">
            <span className="font-body text-xs font-medium text-ink-muted">
              Pontos para o recrutador
            </span>
            <input
              type="number"
              min={0}
              max={RECRUITMENT_LIMITS.MAX_POINTS_PER_AREA}
              value={option.points}
              onChange={(event) =>
                patchAt(index, { points: Number.parseInt(event.target.value, 10) || 0 })
              }
              className={`w-28 ${INPUT_CLASS}`}
            />
          </label>
        </OptionCard>
      ))}

      <div className="flex flex-wrap gap-2">
        <AddButton onClick={() => add("Nova área", 0)} label="Adicionar área" />
        {options.length === 0 ? (
          <SeedButton
            onClick={() =>
              onChange(
                RECRUITMENT_AREA_SEED.map((seed, index) => ({
                  id: slugify(seed.label),
                  label: seed.label,
                  description: null,
                  emoji: null,
                  roleIds: [],
                  points: seed.points,
                  order: index
                }))
              )
            }
          />
        ) : null}
      </div>
    </div>
  );
}
