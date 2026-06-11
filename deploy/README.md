# whatsapp-flow — Deployment Runbook (Contabo VPS, FRESH launch)

Ship the app onto the existing Contabo box **additively**: a loopback-only
compose stack (`app` + `waha` + `litestream` + `restic-backup`) behind the host
nginx, with SQLite replicated to Cloudflare R2. No data migration — first boot
creates a fresh DB.

> **Hard rules (Phase 0):** never bind host `80`/`443` (host nginx owns them),
> never touch the postiz/cobalt/searxng containers or their volumes, the app
> exposes **only** `127.0.0.1:3500` (port `3000` is taken). The box is
> RAM-tight (swap was exhausted at discovery) — keep the mem_limits.

---

## 1. Prerequisites (founder actions)

1. **WAHA Plus subscription** ($19/mo). Core only supports a single `default`
   session (confirmed HTTP 422 in Phase 0) — multi-tenant needs Plus. After
   subscribing, run `docker login` on the VPS with the access granted by the
   sub so `devlikeapro/waha-plus` can be pulled.
2. **Cloudflare R2**: create a bucket and an R2 API token (Object Read & Write).
   Note the account endpoint `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`,
   the access key id, and the secret. Used by both litestream (SQLite) and
   restic (media + WAHA sessions).
3. **Public hostname + DNS**: pick a hostname (e.g. `app.junno.qzz.io`), add a
   Cloudflare DNS record pointing at the VPS with the **orange cloud ON**, and
   set **SSL/TLS mode = Full**. Edge serves HTTPS; origin stays HTTP on port 80.
4. **Secrets** filled into `.env.production` on the VPS (see step 3 below).

---

## 2. Files in this stack

| File | Purpose |
|------|---------|
| `Dockerfile` | Multi-stage build: web + server, lean Node 22 runtime, migrations on start |
| `docker-compose.yml` | `app` (loopback 3500) + `waha` (no host port) + `litestream` + `restic-backup` |
| `litestream.yml` | SQLite WAL → R2 replication |
| `.env.production.example` | All env var names (copy → `.env.production`, fill) |
| `deploy/nginx/app.conf` | nginx vhost template (SSE-safe), installed manually |
| `deploy/deploy.sh` | Idempotent deploy + health gate (`--dry-run` supported) |
| `deploy/docker-entrypoint.sh` | Runs migrations, then starts the server |

---

## 3. First deploy

```bash
# On the VPS, prepare the env file (one time):
ssh contabo
mkdir -p /srv/whatsapp-flow
# copy .env.production.example -> .env.production and fill every REQUIRED var:
#   AUTH_SECRET, AUTH_BASE_URL, MASTER_KEY, WAHA_API_KEY,
#   WAHA_WEBHOOK_HMAC_SECRET, R2_*/AWS_* , RESTIC_REPOSITORY, RESTIC_PASSWORD
docker login            # WAHA Plus pull access
exit

# From the repo root locally — dry-run first to see every action:
deploy/deploy.sh --dry-run
# Then the real deploy (rsync -> build -> up -d -> poll /healthz):
deploy/deploy.sh
```

Install the nginx vhost **once** (additive — see header of
`deploy/nginx/app.conf` for the exact steps):

```bash
# replace APP_HOSTNAME in the file with the real hostname first
sudo cp deploy/nginx/app.conf /etc/nginx/sites-available/<APP_HOSTNAME>
sudo ln -s /etc/nginx/sites-available/<APP_HOSTNAME> /etc/nginx/sites-enabled/<APP_HOSTNAME>
sudo nginx -t && sudo systemctl reload nginx      # reload, NOT restart
```

A green `/healthz` (HTTP 200) means the server is up **and** the DB is
reachable (it runs a real `SELECT 1`), i.e. migrations applied against the
fresh SQLite DB.

---

## 4. First-login / QR-scan flow (go live)

WhatsApp connectivity is per-tenant-instance via WAHA Plus (one NOWEB session
per instance, session name = instance id). To bring an instance online:

1. Sign in to the app (owner account), create/open the WhatsApp instance.
2. The app calls WAHA to **start the session** → it transitions
   `STOPPED → STARTING → SCAN_QR_CODE`.
3. The UI shows the **QR code** (fetched from WAHA `/api/<session>/auth/qr`).
   QR rotates on WhatsApp's ~20s TTL — if it expires, the UI refetches.
4. **Scan it** with the WhatsApp phone (Linked Devices → Link a device).
   Session goes `SCAN_QR_CODE → WORKING`.
5. Send a test message round-trip to confirm. `POST /api/sendText` only
   succeeds once the session is `WORKING` (otherwise WAHA returns 422 — that's
   the expected guard, confirmed in Phase 0).

WAHA sessions persist to the `waha_data` volume, so they survive restarts.

---

## 5. Rollback

The deploy is reversible. To take the app down without touching anything else:

```bash
ssh contabo
cd /srv/whatsapp-flow
docker compose down            # stops ONLY the whatsapp-flow project
exit
```

Remove the public route (leaves all other vhosts intact):

```bash
sudo rm /etc/nginx/sites-enabled/<APP_HOSTNAME>
sudo nginx -t && sudo systemctl reload nginx
```

Data on the named volumes (`sqlite_data`, `media_data`, `waha_data`) survives a
`down`. To roll back to a previous image, `docker compose down`, check out the
prior commit, and re-run `deploy/deploy.sh`. SQLite can be restored from R2:

```bash
litestream restore -config litestream.yml /data/sqlite/app.db
```

`restic` snapshots restore media + WAHA sessions from the R2 repo.

---

## 6. RAM / capacity alerts (Phase 0)

The box runs close to its memory ceiling (≈5.8 GiB free at discovery, **swap
fully consumed**, load ~75–80% on 6 vCPU). App (1.5 GB) + WAHA (2.5 GB) fits but
with thin headroom.

- **Keep the mem_limits** in `docker-compose.yml` — they are not optional.
- **Enforce the 85% RAM / 80% disk alerts from day one** (CEO/Telegram alert).
- **< 10 active WAHA sessions** is comfortable; **20 active sessions is the
  danger zone** on the current host load. Re-measure connected-session RSS
  after the first real session reaches `WORKING`.
- If pressure climbs, free host RAM (idle dev Vite/next-server, surplus
  notebooklm-mcp procs, MT5 if unused) or plan the capacity bump.

---

## 7. Backups at a glance

- **SQLite**: `litestream` replicates the WAL to R2 continuously (1h snapshots,
  72h retention). Restore with `litestream restore`.
- **Media + WAHA sessions**: `restic-backup` snapshots `/data/media` and
  `/data/waha` to the R2 restic repo daily at 03:30 (keep 7d/4w, then prune).
- **R2 token + RESTIC_PASSWORD must be stored safely off-box** — losing the
  restic password makes those backups unrecoverable.
