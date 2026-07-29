# Docker Deployment (client + server containers, Caddy reverse proxy)

This is the container-based deployment path: **client** and **server** each run
as their own Docker container, fronted by a **Caddy** container that handles
HTTPS. Postgres and MinIO are **not** containerized here — they run directly
on the host machine, and the server container reaches them over
`host.docker.internal`.

> If this server already runs the Apache/Virtualmin setup described in
> [`docs/deployment/README.md`](./README.md), read the **"Port conflicts
> with Apache"** section below before starting Caddy — both want ports 80/443.

## Layout

```
your-drive/
├── docker-compose.yml       # caddy only
├── Caddyfile                # app./api./storage. subdomain routing
├── .env                     # DOMAIN=
├── client/
│   ├── Dockerfile
│   ├── docker-compose.yml   # client container
│   └── .env                 # VITE_API_URL, CLIENT_PORT
└── server/
    ├── Dockerfile
    ├── docker-compose.yml           # server container
    ├── docker-compose.override.yml  # local-dev only (TEST_AUTH_TOKEN)
    └── .env                         # DB/S3/secrets/URLs
```

Each `docker-compose.yml` is its own independent Compose project. They're
tied together by a shared **external** Docker network called `webproxy`, so
Caddy can reach `client` and `server` by container name.

## Prerequisites

- Docker Engine + the Compose plugin (`docker compose version` works)
- Postgres and MinIO already running and reachable from the host machine
  (native install, systemd service, or their own separate containers)
- DNS control for your domain
- Ports 80 and 443 free on the host (see conflict note above)

## 1. One-time setup

```bash
git clone git@github.com:devemmm/your-drive.git
cd your-drive
docker network create webproxy
```

## 2. Configure environment files

Three separate `.env` files — each is gitignored, copy from the matching
`.env.example`:

```bash
cp .env.example .env
cp client/.env.example client/.env
cp server/.env.example server/.env
```

- **`.env`** (root) — just `DOMAIN=`. Replace `yourdrive.rw` with your real
  domain everywhere it appears across all three files (single placeholder,
  find-and-replace).
- **`client/.env`** — `VITE_API_URL` (gets baked into the JS bundle at build
  time — must be the public API URL, not `localhost`) and `CLIENT_PORT`.
- **`server/.env`** — `DATABASE_URL` and the `S3_*` vars must point at your
  actual host-installed Postgres/MinIO (real user/password/db name, real
  MinIO access/secret keys — the checked-in file only has placeholders).
  Also set `SECRET_KEY` (random, long) and change `ADMIN_PASSWORD` from the
  default before going live.

## 3. Point DNS at the server

Create A/AAAA records for:
- `app.yourdrive.rw`   → client
- `api.yourdrive.rw`   → server
- `storage.yourdrive.rw` → MinIO (proxied through Caddy to the host)

Caddy issues Let's Encrypt certs automatically on first request, which
requires DNS to already resolve and port 80 to be reachable from the
internet (HTTP-01 challenge).

## 4. Build and start each piece

Order doesn't matter as long as the `webproxy` network already exists
(step 1).

```bash
cd server && docker compose up -d --build
cd ../client && docker compose up -d --build
cd .. && docker compose up -d --build   # starts caddy
```

Note: plain `docker compose up` inside `server/` also picks up
`docker-compose.override.yml` automatically (adds `TEST_AUTH_TOKEN` for
local/dev testing). For a real deploy, either remove that file or run
explicitly with `docker compose -f docker-compose.yml up -d --build` to skip
it.

## 5. Verify

```bash
docker compose -f server/docker-compose.yml ps
docker compose -f client/docker-compose.yml ps
docker compose ps                       # caddy, from the repo root

curl -I https://app.yourdrive.rw
curl -I https://api.yourdrive.rw
curl -I https://storage.yourdrive.rw
```

All three should return `200`/`301`/`302` once certs are issued (can take a
few seconds on first boot — check `docker compose logs -f caddy` if not).

## Redeploying after a code change

```bash
cd server && git pull && docker compose up -d --build
cd ../client && git pull && docker compose up -d --build
```

Restarting the server container re-runs `prisma migrate deploy` and the
admin seed automatically (both are safe to run repeatedly — the seed
upserts, it won't duplicate the admin user or overwrite settings).

## Logs / troubleshooting

```bash
docker compose -f server/docker-compose.yml logs -f server
docker compose -f client/docker-compose.yml logs -f client
docker compose logs -f caddy   # from repo root
```

**`network webproxy declared as external, but could not be found`**
Run `docker network create webproxy` once, before starting client/server/caddy.

**Server can't reach Postgres/MinIO via `host.docker.internal`**
`server/docker-compose.yml` includes `extra_hosts: host.docker.internal:host-gateway`,
which works on Docker Engine 20.10+ on both Linux and Mac. If it still
doesn't resolve (older Docker, unusual network setup), replace
`host.docker.internal` in `server/.env` with the host's actual LAN/private IP
address instead.

**Caddy won't get a certificate**
Confirm DNS actually resolves to this server's public IP (`dig
app.yourdrive.rw`) and that nothing else (e.g. Apache from the setup in
`docs/deployment/README.md`) already holds port 80/443.

## Port conflicts with Apache

The existing staging setup in [`docs/deployment/README.md`](./README.md) uses
Apache/Virtualmin as the reverse proxy on ports 80/443, proxying to
`localhost:3003` and `localhost:9481` directly — no Caddy involved. If you're
deploying this Docker setup to **that same server**, the `caddy` container
will fail to bind 80/443 because Apache already owns them.

Pick one:
- **Different server** — no conflict, use Caddy as documented above.
- **Same server, keep Apache** — skip the root `docker-compose.yml`/Caddy
  entirely. Add new Apache vhosts (same pattern as the existing `.conf`
  files) that proxy to `127.0.0.1:${CLIENT_PORT}` and
  `127.0.0.1:${SERVER_PORT}` instead — those ports are what `client/` and
  `server/`'s compose files already publish on the host.
