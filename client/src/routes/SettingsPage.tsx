import { fetchGuildChannels, fetchGuildConfig, fetchGuildRoles } from "../api/guild";
import { ErrorScreen, LoadingScreen } from "../components/StatusScreen";
import { useApiData } from "../hooks/useApiData";

interface ResolvedRow {
  label: string;
  id: string | null;
  name: string | null;
}

export function SettingsPage() {
  const configState = useApiData(fetchGuildConfig, []);
  const rolesState = useApiData(fetchGuildRoles, []);
  const channelsState = useApiData(fetchGuildChannels, []);

  if (
    configState.status === "loading" ||
    rolesState.status === "loading" ||
    channelsState.status === "loading"
  ) {
    return <LoadingScreen label="Carregando configuração..." />;
  }

  if (configState.status === "error") {
    return (
      <ErrorScreen title="Não foi possível carregar a configuração" message={configState.message} />
    );
  }
  if (rolesState.status === "error") {
    return <ErrorScreen title="Não foi possível carregar os cargos" message={rolesState.message} />;
  }
  if (channelsState.status === "error") {
    return (
      <ErrorScreen title="Não foi possível carregar os canais" message={channelsState.message} />
    );
  }

  const config = configState.data;
  const rolesById = new Map(rolesState.data.map((role) => [role.id, role]));
  const channelsById = new Map(channelsState.data.map((channel) => [channel.id, channel]));

  const roleRows: ResolvedRow[] = [
    {
      label: "Recrutador",
      id: config.recruiterRoleId,
      name: rolesById.get(config.recruiterRoleId)?.name ?? null
    },
    {
      label: "Founder",
      id: config.founderRoleId,
      name: rolesById.get(config.founderRoleId)?.name ?? null
    },
    {
      label: "Membro",
      id: config.memberRoleId,
      name: rolesById.get(config.memberRoleId)?.name ?? null
    }
  ];

  const channelRows: ResolvedRow[] = [
    {
      label: "Aprovação de recrutamento",
      id: config.approvalChannelId,
      name: config.approvalChannelId
        ? (channelsById.get(config.approvalChannelId)?.name ?? null)
        : null
    },
    {
      label: "Anúncio de recrutamento",
      id: config.recruitmentAnnouncementChannelId,
      name: channelsById.get(config.recruitmentAnnouncementChannelId)?.name ?? null
    },
    {
      label: "Log de blacklist",
      id: config.blacklistLogChannelId,
      name: channelsById.get(config.blacklistLogChannelId)?.name ?? null
    }
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">Configuração</h1>
        <p className="mt-1 font-body text-sm text-ink-muted">
          Cargos e canais atualmente configurados para este servidor. Somente leitura por enquanto —
          a edição chega em uma próxima fase.
        </p>
      </div>

      <section className="rounded-xl border border-line bg-surface p-6">
        <h2 className="font-display text-lg font-semibold text-ink">Cargos</h2>
        <ResolvedTable rows={roleRows} emptyLabel="Cargo não configurado" />
      </section>

      <section className="rounded-xl border border-line bg-surface p-6">
        <h2 className="font-display text-lg font-semibold text-ink">Canais</h2>
        <ResolvedTable rows={channelRows} emptyLabel="Canal não configurado" />
      </section>
    </div>
  );
}

function ResolvedTable({ rows, emptyLabel }: { rows: ResolvedRow[]; emptyLabel: string }) {
  return (
    <dl className="mt-4 flex flex-col divide-y divide-line">
      {rows.map((row) => (
        <div key={row.label} className="flex items-center justify-between gap-4 py-3">
          <dt className="font-body text-sm text-ink-muted">{row.label}</dt>
          <dd className="text-right font-body text-sm text-ink">
            {row.id ? (
              <>
                <span className="font-medium">{row.name ?? "Cargo/canal não encontrado"}</span>{" "}
                <span className="font-mono text-xs text-ink-muted">({row.id})</span>
              </>
            ) : (
              <span className="text-ink-muted">{emptyLabel}</span>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
