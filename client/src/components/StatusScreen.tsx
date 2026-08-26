import type { ReactNode } from "react";

import { SpinnerIcon, WarningIcon } from "./icons";

/** Tela cheia usada para estados de carregamento/erro — nunca uma tela branca. */
export function LoadingScreen({ label }: { label: string }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-ground px-6 text-center">
      <SpinnerIcon className="h-8 w-8 text-ember" />
      <p className="font-body text-sm text-ink-muted">{label}</p>
    </main>
  );
}

export function ErrorScreen({
  title,
  message,
  action
}: {
  title: string;
  message: string;
  action?: ReactNode;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-ground px-6 text-center">
      <WarningIcon className="h-9 w-9 text-danger" />
      <h1 className="font-display text-xl font-semibold text-ink">{title}</h1>
      <p className="max-w-sm font-body text-sm text-ink-muted">{message}</p>
      {action}
    </main>
  );
}
