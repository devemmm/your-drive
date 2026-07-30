# Docker Deployment (client + server containers, nginx reverse proxy)

**client** and **server** each run as their own Docker container. Postgres
and MinIO run outside Docker management here (Postgres native on the host;
MinIO in its own standalone container, unrelated to these compose files).
The host's existing **nginx** handles HTTPS and reverse-proxies each
subdomain to the container's published port — see the config templates in
this folder (`nginx-app.conf`, `nginx-api.conf`, `nginx-storage.conf`).

## Layout

```
your-drive/
├── client/
│   ├── Dockerfile
│   ├── docker-compose.yml   # client container
│   └── .env                 # VITE_API_URL, CLIENT_PORT
├── server/
│   ├── Dockerfile
│   ├── docker-compose.yml           # server container
│   ├── docker-compose.override.yml  # local-dev only (TEST_AUTH_TOKEN)
│   └── .env                         # DB/S3/secrets/URLs
└── docs/deployment/
    ├── nginx-app.conf       # app.yourdrive.rw     -> 127.0.0.1:8480 (client)
    ├── nginx-api.conf       # api.yourdrive.rw     -> 127.0.0.1:3003 (server)
    └── nginx-storage.conf   # storage.yourdrive.rw -> 127.0.0.1:9000 (minio)
```

`client` and `server` are independent Compose projects — no shared Docker
network is needed between them, since nginx (on the host) reaches each one
directly via the port it publishes to `127.0.0.1`.

## Prerequisites

- Docker Engine + the Compose plugin (`docker compose version` works)
- nginx already installed and running on the host, owning ports 80/443
- Postgres and MinIO already running and reachable from the host machine
- `certbot` + the nginx plugin for HTTPS: `sudo apt install certbot python3-certbot-nginx`
- DNS control for your domain

## 1. Configure environment files

```bash
cp client/.env.example client/.env
cp server/.env.example server/.env
```

- **`client/.env`** — `VITE_API_URL` (gets baked into the JS bundle at build
  time — must be the public API URL, not `localhost`) and `CLIENT_PORT`.
- **`server/.env`** — `DATABASE_URL` and the `S3_*` vars must point at your
  actual Postgres/MinIO instances. Also set `SECRET_KEY` (random, long) and
  change `ADMIN_PASSWORD` from the default before going live.

If your domain isn't `yourdrive.rw`, replace it (find-and-replace) in
`client/.env`, `server/.env`, and the three `nginx-*.conf` files below.

## 2. Point DNS at the server

Create A/AAAA records for:
- `app.yourdrive.rw`     → this server
- `api.yourdrive.rw`     → this server
- `storage.yourdrive.rw` → this server

## 3. Build and start the containers

```bash
cd server && docker compose up -d --build
cd ../client && docker compose up -d --build
```

Note: plain `docker compose up` inside `server/` also picks up
`docker-compose.override.yml` automatically (adds `TEST_AUTH_TOKEN` for
local/dev testing). For a real deploy, either remove that file or run
explicitly with `docker compose -f docker-compose.yml up -d --build` to skip
it.

Confirm both are up and healthy:
```bash
docker ps
docker exec server-server-1 wget -qO- http://127.0.0.1:3003/health
```

## 4. Install the nginx vhosts

```bash
cd docs/deployment
sudo cp nginx-app.conf     /etc/nginx/sites-available/app.yourdrive.rw
sudo cp nginx-api.conf     /etc/nginx/sites-available/api.yourdrive.rw
sudo cp nginx-storage.conf /etc/nginx/sites-available/storage.yourdrive.rw

sudo ln -s /etc/nginx/sites-available/app.yourdrive.rw     /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/api.yourdrive.rw     /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/storage.yourdrive.rw /etc/nginx/sites-enabled/

sudo nginx -t && sudo systemctl reload nginx
```

## 5. Get HTTPS certificates

```bash
sudo certbot --nginx -d app.yourdrive.rw -d api.yourdrive.rw -d storage.yourdrive.rw
```

Certbot rewrites each vhost file to add the `listen 443 ssl` block and the
HTTP→HTTPS redirect, and sets up auto-renewal (`certbot renew` via a
systemd timer/cron, installed automatically by the package).

## 6. Verify

```bash
curl -I https://app.yourdrive.rw
curl -I https://api.yourdrive.rw
curl -I https://storage.yourdrive.rw
```

All three should return `200`/`301`/`302`.

## Redeploying after a code change

```bash
cd server && git pull && docker compose up -d --build
cd ../client && git pull && docker compose up -d --build
```

nginx config doesn't need touching for routine deploys — only if you add a
new subdomain/service. Restarting the server container re-runs `prisma
migrate deploy` and the admin seed automatically (both are safe to run
repeatedly — the seed upserts, it won't duplicate the admin user or
overwrite settings).

## Logs / troubleshooting

```bash
docker compose -f server/docker-compose.yml logs -f server
docker compose -f client/docker-compose.yml logs -f client
sudo tail -f /var/log/nginx/error.log
```

**nginx fails to bind port 80/443**
Something else already owns it — check with `sudo ss -tlnp | grep ':80 '`.

**502 Bad Gateway from nginx**
The container behind that vhost isn't up, or isn't listening on the port
the vhost expects. Check `docker ps` — `client` should show
`127.0.0.1:8480->80`, `server` should show `127.0.0.1:3003->3003`.

**Certbot can't issue a certificate**
Confirm DNS actually resolves to this server's public IP (`dig
app.yourdrive.rw`) before running certbot — it needs the HTTP-01 challenge
to reach this server on port 80.

**Migration errors on a fresh Postgres (e.g. `extension "postgis" is not
available`)**
The `add_geo_columns` migration requires the PostGIS extension installed at
the OS level, not just enabled. Install it (`sudo apt install
postgresql-<version>-postgis-3`), then clear the failed-migration marker so
Prisma retries:
```bash
docker compose run --rm server npx prisma migrate resolve --rolled-back "20250517162115_add_geo_columns"
docker compose up -d
```
