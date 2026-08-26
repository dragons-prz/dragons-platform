# Deploy e domínio

## Arquitetura

- **VPS** (Contabo, `84.247.175.240`). Deploy automático via
  `.github/workflows/deploy.yml` a cada push em `main`: SSH na VPS →
  `git pull` → `docker compose up --build -d` → `docker image prune`.
  O workflow **só mexe em Docker** — nunca no nginx.
- **Container** `dragons-platform` (ver `docker-compose.yml`): publica em
  `127.0.0.1:3020` (loopback), porta interna 3000. O Fastify serve a API
  **e** a SPA compilada (`client/dist`) na mesma origem.
- **nginx do host** (compartilhado com outros serviços na VPS) termina TLS
  e faz `proxy_pass` para `127.0.0.1:3020`. Roteia por `server_name`
  (Host header) — cada domínio é um vhost; não há porta nova por domínio.
- **Firestore**: o mesmo projeto que o bot (`dragonsbot`) usa. O painel lê
  e escreve nas mesmas coleções.

## Variáveis de ambiente que dependem do domínio

Ficam no `.env` **da VPS** (no diretório do deploy, junto do
`docker-compose.yml`) — não versionado. Ver `server/src/config/env.ts`.

| Var                    | Valor em produção                                                                                                        |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `CLIENT_ORIGIN`        | `https://dragonsprz.lat` (sem barra final — o server faz `reply.redirect(clientOrigin)` após o login)                    |
| `DISCORD_REDIRECT_URI` | `https://dragonsprz.lat/api/auth/discord/callback` (tem de estar **idêntico** nos Redirects do Discord Developer Portal) |
| `NODE_ENV`             | `production` (liga a flag `Secure` no cookie de sessão)                                                                  |

Nenhuma outra parte do código tem host fixo: o client chama a API com
caminhos relativos e não há CORS (mesma origem em produção).

## Trocar / adicionar um domínio

Domínio atual: `dragonsprz.lat` (canônico). Host legado por IP:
`84-247-175-240.sslip.io` (mantido até a migração ser validada).

### 1. DNS

No registrador do domínio:

| Tipo    | Nome  | Valor            |
| ------- | ----- | ---------------- |
| `A`     | `@`   | `84.247.175.240` |
| `CNAME` | `www` | `dragonsprz.lat` |

Confirmar: `dig +short dragonsprz.lat` → `84.247.175.240`.

### 2. Discord Developer Portal

App → **OAuth2 → Redirects** → adicionar
`https://dragonsprz.lat/api/auth/discord/callback`. Manter o redirect
antigo até validar; remover depois. **Sem esse passo o login quebra** (nos
dois domínios, assim que o `.env` apontar para o novo callback).

### 3. nginx + TLS (na VPS, manual)

`deploy/nginx-dragons-platform.conf` é o template pré-certbot. Aplicar como
arquivo próprio (não sobrescrever o vhost do sslip, que é gerido pelo
certbot):

```bash
sudo cp deploy/nginx-dragons-platform.conf /etc/nginx/sites-available/dragonsprz.lat
sudo ln -s /etc/nginx/sites-available/dragonsprz.lat /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d dragonsprz.lat -d www.dragonsprz.lat --redirect
```

O `--redirect` faz o certbot adicionar o 80 → 443. Ele reescreve
`/etc/nginx/sites-available/dragonsprz.lat` com os blocos `443 ssl`.

### 4. `.env` da VPS + recreate

```bash
cd "$APP_DIR"          # diretório do docker-compose.yml
cp .env .env.bak.$(date +%Y%m%d%H%M%S)
# ajustar CLIENT_ORIGIN, DISCORD_REDIRECT_URI, NODE_ENV (tabela acima)
docker compose up -d --force-recreate    # só env mudou; rebuild não é necessário
```

### 5. Validar

```bash
curl -I https://dragonsprz.lat/paineis          # 200
docker compose logs --tail=50 dragons-platform
```

No navegador: abrir `https://dragonsprz.lat/paineis` → "Entrar com Discord"
→ deve voltar autenticado para `https://dragonsprz.lat/paineis`. Conferir o
cookie `dragons_session` com `Secure` no domínio novo.

### 6. Depois de validado

- Remover o redirect URI antigo no Discord.
- Converter o vhost do `84-247-175-240.sslip.io` em
  `return 301 https://dragonsprz.lat$request_uri;` (deixa de ter duas
  origens canônicas).

## Notas de operação

- **Portas**: nginx no `:80/:443`; app no `:3020` (loopback). Adicionar
  domínio = novo `server_name`, nunca porta nova. O `:3020` já está
  ocupado pelo próprio app — não é conflito.
- Outros serviços na VPS (ex.: `axioma.sentinelatrends.org`) têm vhosts
  próprios e não são afetados.
- O deploy por GitHub Actions não toca no nginx — mudanças de vhost/cert
  são passo manual único e sobrevivem aos deploys seguintes.
- `certbot` renova sozinho via timer do systemd; o cert do domínio novo
  entra nessa renovação automaticamente.
