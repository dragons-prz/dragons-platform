import type { DiscordChannelSummary, PanelConfig } from "@dragons/shared";
import { useEffect, useState } from "react";

import { ApiError } from "../api/client";
import { fetchGuildChannels } from "../api/guild";
import { SpinnerIcon, WarningIcon } from "../components/icons";
import type { PublishPollingState } from "./usePublishStatusPolling";

function channelLabel(channels: DiscordChannelSummary[] | null, channelId: string): string {
  const channel = channels?.find((candidate) => candidate.id === channelId);
  return channel ? `#${channel.name}` : `canal ${channelId}`;
}

/** Mensagem de status compartilhada pelos fluxos de publicar/sincronizar, todos guiados pelo mesmo `usePublishStatusPolling`. */
function PollingStatus({
  state,
  context
}: {
  state: PublishPollingState;
  context: "publish" | "sync";
}) {
  if (state.phase === "idle") return null;

  if (state.phase === "polling") {
    return (
      <p className="flex items-center gap-2 font-body text-xs text-ink-muted">
        <SpinnerIcon className="h-3.5 w-3.5" />
        {context === "publish" ? "Publicando no Discord..." : "Atualizando no Discord..."}
      </p>
    );
  }

  if (state.phase === "completed") {
    return (
      <p className="font-body text-xs text-ok">
        {context === "publish" ? "Publicado no Discord." : "Atualizado no Discord."}
      </p>
    );
  }

  if (state.phase === "failed") {
    return (
      <p role="alert" className="flex items-start gap-2 font-body text-xs text-danger">
        <WarningIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Falha ao {context === "publish" ? "publicar" : "atualizar"} no Discord: {state.error}
      </p>
    );
  }

  // timeout
  return (
    <p className="flex items-start gap-2 font-body text-xs text-warn">
      <WarningIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      Ainda não recebemos confirmação — pode estar demorando (o bot está online?). Você pode
      continuar usando o painel normalmente.
    </p>
  );
}

export function PublishPanelSection({
  panel,
  pollingState,
  pollingContext,
  publishing,
  publishError,
  onPublish,
  syncing,
  onSyncNow
}: {
  panel: PanelConfig;
  pollingState: PublishPollingState;
  pollingContext: "publish" | "sync";
  publishing: boolean;
  publishError: string | null;
  onPublish: (channelId: string) => void;
  syncing: boolean;
  onSyncNow: () => void;
}) {
  const [channels, setChannels] = useState<DiscordChannelSummary[] | null>(null);
  const [channelsError, setChannelsError] = useState<string | null>(null);
  const [selectedChannelId, setSelectedChannelId] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetchGuildChannels(controller.signal)
      .then((list) => {
        setChannels(list);
        setSelectedChannelId((current) => current || (list[0]?.id ?? ""));
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setChannelsError(
          error instanceof ApiError ? error.message : "Não foi possível carregar os canais."
        );
      });
    return () => controller.abort();
  }, []);

  const [isChangingChannel, setIsChangingChannel] = useState(false);

  useEffect(() => {
    if (panel.publishedChannelId && pollingState.phase === "completed") {
      setIsChangingChannel(false);
    }
  }, [panel.publishedChannelId, pollingState.phase]);

  const isBusy = publishing || pollingState.phase === "polling";

  if (!panel.publishedChannelId || isChangingChannel) {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-display text-sm font-semibold text-ink">
              {isChangingChannel ? "Alterar canal de publicação" : "Publicar no Discord"}
            </h2>
            <p className="mt-1 font-body text-xs text-ink-muted">
              {isChangingChannel
                ? "Escolha um novo canal. Uma nova mensagem será enviada e as futuras edições passarão a ser sincronizadas nela."
                : "Este painel ainda não foi publicado por aqui. Escolha um canal e publique — depois disso, as próximas edições sincronizam sozinhas."}
            </p>
          </div>
          {isChangingChannel ? (
            <button
              type="button"
              onClick={() => setIsChangingChannel(false)}
              disabled={isBusy}
              className="text-xs font-medium text-ink-muted hover:text-ink disabled:opacity-40"
            >
              Cancelar
            </button>
          ) : null}
        </div>

        {channelsError ? (
          <p role="alert" className="font-body text-xs text-danger">
            {channelsError}
          </p>
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label htmlFor="publish-channel" className="sr-only">
              Canal de destino
            </label>
            <select
              id="publish-channel"
              value={selectedChannelId}
              onChange={(event) => setSelectedChannelId(event.target.value)}
              disabled={!channels || isBusy}
              className="rounded-lg border border-line bg-ground px-3 py-2 font-body text-sm text-ink outline-none focus-visible:border-ember disabled:opacity-60"
            >
              {!channels ? <option>Carregando canais...</option> : null}
              {channels?.map((channel) => (
                <option key={channel.id} value={channel.id}>
                  #{channel.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => onPublish(selectedChannelId)}
              disabled={!selectedChannelId || isBusy}
              className="w-fit rounded-lg bg-ember px-4 py-2 font-display text-sm font-semibold text-on-accent transition-colors hover:bg-ember/85 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {publishing ? "Publicando..." : "Publicar"}
            </button>
          </div>
        )}

        {publishError ? (
          <p role="alert" className="font-body text-xs text-danger">
            {publishError}
          </p>
        ) : null}
        <PollingStatus state={pollingState} context={pollingContext} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-6">
      <div>
        <h2 className="font-display text-sm font-semibold text-ink">Publicado no Discord</h2>
        <p className="mt-1 font-body text-xs text-ink-muted">
          Publicado em {channelLabel(channels, panel.publishedChannelId)}. Editar e salvar este
          painel atualiza a mensagem automaticamente.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onSyncNow}
          disabled={syncing || pollingState.phase === "polling"}
          className="w-fit rounded-lg border border-line px-4 py-2 font-display text-sm font-medium text-ink transition-colors hover:border-ember disabled:cursor-not-allowed disabled:opacity-40"
        >
          {syncing ? "Sincronizando..." : "Sincronizar agora"}
        </button>
        <button
          type="button"
          onClick={() => setIsChangingChannel(true)}
          disabled={syncing || pollingState.phase === "polling"}
          className="w-fit rounded-lg border border-line px-4 py-2 font-display text-sm font-medium text-ink transition-colors hover:border-ember disabled:cursor-not-allowed disabled:opacity-40"
        >
          Alterar canal
        </button>
      </div>
      <PollingStatus state={pollingState} context={pollingContext} />
    </div>
  );
}
