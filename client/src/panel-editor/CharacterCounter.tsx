/** Contador de caracteres com estado de alerta perto do limite e erro ao ultrapassar. */
export function CharacterCounter({ current, max }: { current: number; max: number }) {
  const isOver = current > max;
  const isNear = !isOver && current >= max * 0.9;

  return (
    <span
      className={`font-mono text-xs ${isOver ? "text-danger" : isNear ? "text-warn" : "text-ink-muted"}`}
      aria-live="polite"
    >
      {current}/{max}
    </span>
  );
}
