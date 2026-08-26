export function ComingSoon({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-xl border border-line bg-surface p-8">
      <span className="rounded-full border border-line px-3 py-1 font-mono text-xs text-ink-muted">
        Em breve
      </span>
      <h1 className="font-display text-2xl font-bold text-ink">{title}</h1>
      <p className="max-w-md font-body text-sm text-ink-muted">{description}</p>
    </div>
  );
}
