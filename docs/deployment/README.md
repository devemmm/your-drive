# Deployment Configs

Reverse proxy vhost directives for the staging server (Virtualmin / Apache).

> For the container-based deployment (client + server as Docker containers,
> Caddy for HTTPS), see [`DOCKER_DEPLOY.md`](./DOCKER_DEPLOY.md) instead.

## Files

| File | Proxies to | Public URL |
|---|---|---|
| `apache-yourdrive-api.conf` | `localhost:3003` (Node API) | https://yourdrive-api.uat.co.zw |
| `apache-yourdrive-minio.conf` | `localhost:9481` (MinIO Console) | https://yourdrive-minio.uat.co.zw |

Both include:
- `ProxyPreserveHost On` + `X-Forwarded-Proto` so the upstream sees the real host/scheme
- Conditional WebSocket/HTTP proxy (WebSocket upgrade requests go to `ws://`, everything else to `http://`)
- `ProxyTimeout 600` for long-running requests and large uploads
- Virtualmin's auto-generated PHP/FCGI boilerplate (left in place so Virtualmin doesn't fight the config on regeneration)

## How to apply

1. Copy the relevant file contents into the matching site config on the staging server:
   - `/etc/apache2/sites-enabled/yourdrive-api.uat.co.zw.conf`
   - `/etc/apache2/sites-enabled/yourdrive-minio.uat.co.zw.conf`

2. Replace the content **inside** the `<VirtualHost *:443>` block only. Leave any `<VirtualHost *:80>` HTTP block above it alone (it's for Let's Encrypt renewal and HTTP→HTTPS redirect).

3. Test and reload:
   ```bash
   apachectl configtest
   systemctl reload apache2
   ```

## Required Apache modules

```bash
a2enmod proxy proxy_http proxy_wstunnel rewrite headers ssl
systemctl reload apache2
```

`proxy_wstunnel` is critical for Socket.IO and the MinIO Console — without it, real-time features fall back to slow polling or break entirely.

## Do not copy-paste from markdown code blocks

The `AllowOverride All` line in the original Virtualmin template sometimes wraps across two lines when pasted from markdown, causing:

```
Invalid command 'Options=ExecCGI,...'
```

These `.conf` files use the safer short form `AllowOverride All` (no `Options=...` suffix) so there's nothing to wrap.
