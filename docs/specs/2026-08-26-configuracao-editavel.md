# Configuração editável no painel

Data: 2026-08-26
Status: Fase A em implementação

## Contexto

Hoje a aba **Configuração** (`client/src/routes/SettingsPage.tsx`) só
_espelha_ o documento `guildConfigs/{guildId}` do Firestore: mostra os 3
cargos (`recruiter`, `founder`, `member`) e os 3 canais (`approval`,
`recruitment`, `blacklist`) em uma tabela somente-leitura. O backend só
expõe `GET /api/config`.

Vários parâmetros que o bot (`~/dev/dragonsbot`) usa em runtime **não estão
no `GuildConfig`** — são constantes fixas em
`dragonsbot/src/domain/types.ts` (`MEMBER_VERIFICATION_CHANNEL_ID`,
`MEMBER_EXIT_CHANNEL_ID`, `RECRUITMENT_POINTS`,
`RECRUITMENT_CREDIT_WINDOW_HOURS`, `DEFAULT_HIERARCHY_ROLES`).

Objetivo do Founder: configurar cargos e a relação deles com o bot, e os
canais para onde vão os anúncios, direto pelo painel — sem precisar de
comando slash nem deploy.

## Regra crítica herdada

`shared/src/guild-config.ts` e `shared/src/panel.ts` são **espelho** de
`dragonsbot/src/domain/types.ts`. Qualquer mudança de forma no `GuildConfig`
(campos, tipos, valores) tem de ser feita nos **dois** repositórios ao mesmo
tempo, senão o painel passa a gravar documentos que o bot não entende. Isso
define o corte entre as fases abaixo.

## Fases

### Fase A — edição + diagnóstico (só painel, sem tocar no bot) — ESTA SPEC

Não muda a forma do `GuildConfig`; só passa a **escrever** os campos que já
existem, e adiciona um bloco de saúde da integração.

- `PATCH /api/config` — atualização parcial dos 3 cargos + 3 canais já
  presentes no `GuildConfig`. Valida forma (snowflake) em `shared` e
  existência do id na guild no servidor (via `getGuildRoles` /
  `getGuildChannels`, já cacheados ~60s). Loga `config.updated`.
- `GET /api/config/health` — lista de checagens:
  - cada cargo obrigatório está configurado e ainda existe no servidor;
  - cada canal obrigatório está configurado e ainda é um canal de texto
    (o `approval` é opcional — sem ele o bot manda aprovação por DM);
  - o cargo mais alto do bot está **acima** do cargo de membro na
    hierarquia do Discord (o bot não consegue aplicar um cargo acima do
    dele — requisito documentado no README do bot).
- `SettingsPage.tsx` vira formulário: `<select>` de cargo/canal populados
  por `/api/guild/roles` e `/api/guild/channels`, detecção de alterações
  não salvas, estados de salvando/salvo/erro (mesmo padrão de
  `PanelEditPage.tsx`), e o bloco de saúde no topo.

Autorização: qualquer sessão autorizada (founder ou admin) pode editar —
mesmo modelo que já vale para criar/publicar painéis. Restringir para
admin-only é decisão da Fase D.

### Fase B — trazer parâmetros hoje fixos no bot para o `GuildConfig`

Muda a forma do `GuildConfig` → **exige PR coordenado nos dois repos** +
avaliar script de migração (`dragonsbot/src/migrate-firestore-members.ts` é
o padrão).

Campos candidatos:

| Campo novo                     | Constante atual no bot                 |
| ------------------------------ | -------------------------------------- |
| `memberVerificationChannelId`  | `MEMBER_VERIFICATION_CHANNEL_ID`       |
| `memberExitChannelId`          | `MEMBER_EXIT_CHANNEL_ID`               |
| `recruitmentPoints`            | `RECRUITMENT_POINTS` (8)               |
| `recruitmentCreditWindowHours` | `RECRUITMENT_CREDIT_WINDOW_HOURS` (24) |

O bot passa a ler esses campos do `guildConfigs/{guildId}` com fallback para
a constante quando ausente; o painel ganha os campos no formulário.

### Fase C — editor de hierarquia de ranks

`DEFAULT_HIERARCHY_ROLES` (22 ranks: nome, `roleId`, pontos, ordem) hoje só
é _semeado_ a partir do default; existe a flag `hierarchySeeded`. Fase C
transforma isso em coleção editável (`guildConfigs/{guildId}/hierarchy` ou
array no doc): adicionar/remover rank, editar limiar de pontos, reordenar,
remapear para cargo do Discord. Também precisa de PR coordenado.

### Fase D — permissões e auditoria

- Modelo de permissão por cargo: quem cria painel, quem publica, quem edita
  config, quem mexe na blacklist (hoje é tudo-ou-nada: founder/admin).
- Trilha de auditoria persistida das mudanças de config (o servidor já
  loga `config.updated` estruturado; falta persistir + tela).
- Roteamento de anúncio por evento (recrutamento aprovado, rank-up, entrada,
  saída, blacklist) com canal e liga/desliga por evento, opcionalmente com
  template de embed reaproveitando o preview do panel-editor.

## Contrato da Fase A

### `shared/src/guild-config-api.ts` (novo — NÃO é espelho do bot)

```ts
export const DISCORD_SNOWFLAKE_PATTERN = /^\d{17,20}$/;

export interface UpdateGuildConfigRequest {
  recruiterRoleId?: string;
  founderRoleId?: string;
  memberRoleId?: string;
  approvalChannelId?: string | null; // null = limpar
  recruitmentAnnouncementChannelId?: string;
  blacklistLogChannelId?: string;
}

export function validateGuildConfigUpdate(patch: UpdateGuildConfigRequest): string | null;

export type GuildConfigHealthLevel = "ok" | "warning" | "error";
export interface GuildConfigHealthCheck {
  id: string;
  level: GuildConfigHealthLevel;
  label: string;
  detail: string;
}
export interface GuildConfigHealthResponse {
  checks: GuildConfigHealthCheck[];
  worst: GuildConfigHealthLevel;
}
```

### Endpoints

- `PATCH /api/config` → `GuildConfig` atualizado (400 em forma inválida ou
  id inexistente na guild).
- `GET /api/config/health` → `GuildConfigHealthResponse`.

### Arquivos tocados na Fase A

- `shared/src/guild-config-api.ts` (novo) + export em `shared/src/index.ts`
- `server/src/discord/discord-client.ts` — `position` no tipo `DiscordRole`
- `server/src/firestore/guild-config-repository.ts` — `updateGuildConfig`
- `server/src/routes/config.ts` — `PATCH /api/config`, `GET /api/config/health`
- `client/src/api/guild.ts` — `updateGuildConfig`, `fetchGuildConfigHealth`
- `client/src/routes/SettingsPage.tsx` — formulário editável + bloco de saúde

## Fora de escopo (Fase A)

Multi-guild, blacklist CRUD no painel, templates de anúncio, permissão
granular, edição de hierarquia, qualquer campo que não exista hoje no
`GuildConfig`.
