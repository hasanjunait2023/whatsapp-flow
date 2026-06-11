# Phase 0 Report — Infra Discovery + WAHA Pilot

**Date:** 2026-06-11
**Host:** Contabo VPS, alias `contabo` → root@13.140.152.96, Ubuntu 24.04 (kernel 6.8.0), 6 vCPU / 12 GiB RAM, Docker 29.5.3
**Scope:** Read-only discovery + additive WAHA Core pilot. No existing container/service touched. Host ports 80/443 not bound.

---

## 1. Proxy discovery — how 80/443 are served

**Owner of 80 and 443: host `nginx`** (systemd `nginx.service`, NOT a container). PIDs confirmed via `ss -tlnp`. `nginx -t` passes (one benign duplicate-MIME warning in `tools.junno.qzz.io`).

- **Config root:** `/etc/nginx/nginx.conf` includes `/etc/nginx/conf.d/*.conf` (empty) and `/etc/nginx/sites-enabled/*`.
- **Vhost model:** one file per subdomain in `/etc/nginx/sites-available/`, symlinked (or copied) into `/etc/nginx/sites-enabled/`. Reverse-proxy vhosts `proxy_pass` to a loopback upstream `http://127.0.0.1:<port>`.
- **TLS termination — two patterns coexist:**
  1. **Cloudflare-proxied (most vhosts):** all `*.junno.qzz.io` vhosts (`kanban`, `tools`, `crypto`, `tradevault`, `signalbot`, `webhook`, `axis-mission-control`) and `00-landing` listen on **port 80 only**. TLS is terminated at Cloudflare's edge (orange-cloud); nginx serves plain HTTP on the origin. No `cloudflared` tunnel is running — it's standard Cloudflare reverse proxy to the public IP.
  2. **Origin cert on nginx (one vhost):** `ecomex.cloud` is the only vhost with a real `listen 443 ssl http2` block, using a manual cert pair at `/etc/nginx/ssl/ecomex.cloud.crt` + `.key` (NOT certbot/letsencrypt `live/` — likely a Cloudflare Origin cert). `certbot` is installed at `/usr/bin/certbot` but `/etc/letsencrypt/live` does not exist.

### Procedure to add our app as a new upstream vhost (Phase 5 cutover)

The app container will expose on a loopback port (plan: `127.0.0.1:3000`, but **3000 is already taken** — see port map; pick a free one like `3500`). Recommended approach mirroring the existing `kanban` reverse-proxy vhost:

1. Pick the public hostname (e.g. `app.junno.qzz.io` or a dedicated domain) and point its DNS at the VPS via Cloudflare (orange-cloud → free edge TLS, matches the dominant pattern; no origin cert needed).
2. Create `/etc/nginx/sites-available/<hostname>`:
   ```nginx
   server {
       listen 80;
       listen [::]:80;
       server_name app.junno.qzz.io;

       # SSE needs buffering off + long read timeout (our multiplexed realtime stream)
       location /api/ {
           proxy_pass http://127.0.0.1:3500;
           proxy_http_version 1.1;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header Connection "";
           proxy_buffering off;          # required for SSE
           proxy_read_timeout 86400s;    # long-lived SSE stream
       }
       location / {
           proxy_pass http://127.0.0.1:3500;
           proxy_http_version 1.1;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       }
       location ~ /\. { deny all; }
   }
   ```
3. `ln -s /etc/nginx/sites-available/<hostname> /etc/nginx/sites-enabled/<hostname>`
4. `nginx -t && systemctl reload nginx` (reload, not restart — zero downtime for other vhosts).
5. In Cloudflare, set SSL/TLS mode to **Full** and enable the orange cloud for the hostname; edge serves HTTPS, origin stays HTTP on 80. If a same-IP origin cert is preferred instead, copy the `ecomex.cloud` `listen 443 ssl` pattern and reference an origin cert under `/etc/nginx/ssl/`.

**SSE caveat (important for our app):** the realtime stream is one long-lived SSE connection per tab. The vhost MUST set `proxy_buffering off` and a long `proxy_read_timeout`, otherwise nginx buffers/cuts the stream. The existing vhosts don't do SSE, so this is new — included above.

**Never:** bind our containers to host 80/443, or edit/replace existing vhost files. Additive only.

---

## 2. Port map (avoid collisions)

Host-listening ports observed (`ss -tlnp`). **3000 is taken** — the plan's assumed app port collides; pick a free loopback port (e.g. 3500/3600).

| Port | Bind | Owner | Notes |
|---|---|---|---|
| 22 | 0.0.0.0 | sshd | — |
| 53 | 127.0.0.x | systemd-resolved | — |
| **80** | 0.0.0.0 | **nginx** | proxy — DO NOT BIND |
| **443** | 0.0.0.0 | **nginx** | proxy (TLS for ecomex.cloud) — DO NOT BIND |
| 631 | localhost | cupsd | — |
| 3000 | 127.0.0.1 | node | **TAKEN — plan's app port collides, choose another** |
| 3030 | 0.0.0.0 | python3 | — |
| 3031 | * | next-server | — |
| 3069 | * | next-server | — |
| 3088 | 0.0.0.0 | python | — |
| 3250 | * | node | — |
| 3260 | * | next-server | — |
| 3350 | ::1 | xrdp-sesman | — |
| 3389 | * | xrdp | RDP |
| 4007 | 0.0.0.0 + [::] | docker-proxy → **postiz** | only publicly-bound container |
| 5173 | 0.0.0.0 | python (Vite) | — |
| 5174 | 127.0.0.1 | python3 | kanban upstream |
| 5180/5181 | 0.0.0.0 | python | — |
| 5433 | 127.0.0.1 | docker-proxy → paperclip-postgres | — |
| 7790 | 0.0.0.0 | python3 | — |
| 8000 | 0.0.0.0 | python | — |
| 8090 | * | pocketbase | — |
| 8644 | 0.0.0.0 | python3 | — |
| 8761 | 127.0.0.1 | gunicorn | dl-api upstream |
| 8765 | 0.0.0.0 | python3 | — |
| 8888 | 127.0.0.1 | docker-proxy → searxng | — |
| 9000 | 127.0.0.1 | docker-proxy → cobalt-api | — |
| 9222 | 127.0.0.1 | chrome (devtools) | — |
| 11434 | 127.0.0.1 | ollama | — |
| 18812 | 127.0.0.1 | wineserver | — |
| **3999** | **127.0.0.1** | **waha-pilot (this phase)** | our pilot, loopback only |

**Recommendation for prod:** app on `127.0.0.1:3500`, WAHA Plus has **no public port** (webhooks are container-to-container over a shared docker network). The pilot used `host.docker.internal:3000` for the webhook target as a placeholder; in prod, put `app` and `waha` on the same compose network and target `http://app:3000/...` directly.

---

## 3. Directory provisioning

`/data` already existed (only contained `postmortems.json`, untouched). Created:

```
/data/sqlite       drwxr-x--- root:root   (SQLite DB + WAL → Litestream)
/data/media        drwxr-x--- root:root   (tenant media)
/data/waha         drwxr-x--- root:root   (WAHA Plus prod sessions)
/data/waha-pilot   drwxr-x--- root:root   (this pilot; .pilot-env, qr.png, noweb/default/)
```

Perms `750` (root only). When containers run as non-root, adjust ownership to the container UID at compose time. Pilot session files persisted correctly to `/data/waha-pilot/noweb/default/` — confirms the volume mount + session persistence across restarts works.

---

## 4. WAHA pilot — image, run, API shapes verified

### Image (pin this)
- **Pulled:** `devlikeapro/waha:latest` (Core / free tier).
- **Digest to pin:** `devlikeapro/waha@sha256:da28b2c7419ed16219487103c55ce6832e519b4293c720e228e02ae24256d191`
- **Version:** `2026.5.1`, engine `NOWEB`, tier `CORE`, built `2026-05-26T05:52:49Z`, revision `9e11312b75f3c38dd689b69c0f84a682120284b2`, Apache-2.0.
- For prod, swap to `devlikeapro/waha-plus` at an equivalent pinned digest/tag once the founder buys Plus.

### Run command used (pilot)
```bash
docker run -d --name waha-pilot --restart unless-stopped \
  -p 127.0.0.1:3999:3000 \
  -e WHATSAPP_DEFAULT_ENGINE=NOWEB \
  -e WAHA_API_KEY=<random hex24> \
  -v /data/waha-pilot:/app/.sessions \
  --memory 1g \
  devlikeapro/waha@sha256:da28b2c7419ed16219487103c55ce6832e519b4293c720e228e02ae24256d191
```
- Bound **only to `127.0.0.1:3999`** (unused port). API key generated with `openssl rand -hex 24`, stored at `/data/waha-pilot/.pilot-env` (chmod 600). All API calls authenticate with header `X-Api-Key: <key>`.

### CORE vs PLUS — confirmed blocker, expected
WAHA **Core supports only a single session named `default`**. Attempting `POST /api/sessions {name: "pilot"}` returned HTTP 422: *"WAHA Core support only 'default' session ... please get WAHA PLUS version."* This **validates the plan's requirement** that production needs **WAHA Plus** (one session per tenant instance, `name = instance_id`). The pilot proceeded with the `default` session.

### Session lifecycle verified (against live instance)
1. A `default` session auto-exists (STOPPED). Configured webhook via `PUT /api/sessions/default` with body `{config:{webhooks:[{url, events:[message, message.ack, session.status]}]}}`.
2. `POST /api/sessions/default/start` → status transitions `STOPPED → STARTING → SCAN_QR_CODE`.
3. `GET /api/default/auth/qr?format=image` → HTTP 200, `image/png`, 292×292, 5519 bytes. Saved to `/data/waha-pilot/qr.png` and copied to **`c:\Users\Junait\whatsapp-flow-main\.claude\team\pilot-qr.png`** (verified scannable).
4. **Session is currently in `SCAN_QR_CODE` state, waiting for the founder to scan.** This is the expected stopping point — bringing it to WORKING needs the founder's phone.

### API shapes verified live
- **`GET /api/sessions`** →
  ```json
  [{"name":"default","status":"SCAN_QR_CODE",
    "config":{"webhooks":[{"url":"...","events":["message","message.ack","session.status"]}]},
    "me":null,"presence":null,"timestamps":{}}]
  ```
- **`GET /api/sessions/default`** → same + `"engine":{"engine":"NOWEB"}`.
- **Webhook config API:** set at session create/update under `config.webhooks[]` = `{url, events}`. Events relevant to us: `message`, `message.ack`, `session.status`. (Confirmed accepted and echoed back by the server.)
- **`GET /api/version`** → `{version, engine, tier, browser, platform, worker}`.
- **Send-text shape — endpoint confirmed live:** `POST /api/sendText` with body `{"session":"default","chatId":"<num>@c.us","text":"..."}`. Returned HTTP 422 `{"error":"Session status is not as expected...","expected":["WORKING"]}` — i.e. the endpoint and request schema are valid; it correctly refuses to send until the session is WORKING (post-scan). This is the exact shape Phase 2's send path will call.
- **OpenAPI/swagger:** `/api`, `/api-json`, `/openapi.json` all return **401** without the dashboard credential (separate from the API key). Endpoint behavior was verified directly against the running server instead (stronger evidence than the static spec).

### RSS measurements (NOWEB, pilot, `--memory 1g`)
| State | RSS | CPU |
|---|---|---|
| Idle (no session started) | ~285 MiB | ~3.5% (boot) |
| Session created, SCAN_QR_CODE, settled | **~236 MiB** | ~0.2% |

**Caveat — this is a PRE-CONNECTION baseline.** The session never reached WORKING (needs founder scan), so this does NOT reflect a connected session's footprint. NOWEB connected sessions typically run ~150–250 MB each. **Per-session estimate for budgeting: ~250 MB/connected session + ~250 MB engine base.** For <20 sessions at launch: base ~250 MB + 20 × ~250 MB ≈ **~5.25 GB worst case**, which is why the plan caps WAHA at `mem_limit: 2500m` and sessions <20. Real connected RSS must be re-measured in Phase 2 once a session is WORKING. The 2.5 GB cap is plausible for ~8–10 light sessions but **tight for 20 active sessions** — flag for monitoring.

---

## 5. Resource audit + RAM budget verdict

### Live snapshot (during pilot, SCAN_QR state)
```
Mem:  11Gi total | 5.9Gi used | 5.8Gi available | buff/cache 5.5Gi
Swap: 2.0Gi total | 2.0Gi USED | ~0 free   ← swap fully consumed
Disk: 193G total | 103G used | 90G free (54%)
Load: ~3.8–4.9 on 6 vCPU (sustained ~65–80%)
```

### Existing container footprint (additive load is small)
postiz 268 MiB, searxng 114 MiB, paperclip-postgres 62 MiB, cobalt-api 23 MiB, postiz-postgres 13 MiB, postiz-redis 8 MiB → **~490 MiB total in containers.** The real RAM consumers are **host processes**: a fleet of `hermes-agent` python gateways (~430+390+360+280 MiB), an `axis-mission-control` tsserver (~300 MiB), multiple `notebooklm-mcp-server` node procs (~175 MiB each), an MT5 Wine terminal (~180 MiB at 22% CPU), plus next-server/Vite dev servers.

### Budget verdict: **CONDITIONAL GO — tighter than the plan assumed**

App (1.5 GB) + WAHA (2.5 GB) = **4.0 GB** required.

- **RAM:** 5.8 GiB currently available, but **swap is already 100% exhausted** — the box is under memory pressure right now and would start the new stack with little headroom. 4.0 GB fits the 5.8 GB available *today*, leaving ~1.8 GB — but that margin is thin and the host process mix (dev servers, agents) is volatile. **Verdict: fits, but no comfortable buffer. The plan's 85% RAM Telegram alert is mandatory, not optional.**
- **CPU:** load average ~4.3–4.9 on 6 cores = **~75–80% sustained already** (MT5 at 22%, multiple agents). Adding app + WAHA NOWEB (low CPU at idle, spikes on message bursts and session connect) is feasible but the box has limited CPU headroom. Watch CPU steal (Contabo oversubscription risk #10).
- **Disk:** 90 GB free — ample for SQLite + media + WAHA sessions short-term.

**Recommendation:** before prod cutover, the founder should consider freeing host RAM (idle dev Vite/next-server processes, surplus notebooklm-mcp-server instances, MT5 if not needed) OR treat the Hetzner exit path (risk #10) as more likely than the plan implies. The numbers work for launch at <10 active sessions; 20 active sessions + current host load is the danger zone.

---

## 6. Blocking / follow-ups for backlog

1. **[Expected, not blocking]** Pilot session is in `SCAN_QR_CODE` — needs the founder to scan `c:\Users\Junait\whatsapp-flow-main\.claude\team\pilot-qr.png` with WhatsApp to reach WORKING and complete the "one real WA message" verify. QR rotates (~20s WhatsApp TTL) — if expired when founder is ready, re-fetch with `GET /api/default/auth/qr?format=image`. After scan, re-measure connected-session RSS and run a `POST /api/sendText` round-trip.
2. **[Plan correction]** Host port **3000 is occupied** (a node process) — the plan's `app` expose port collides. Use `127.0.0.1:3500` (or similar free port) for the app upstream.
3. **[Procurement]** Production requires **WAHA Plus** (Core blocks multi-session, confirmed). Founder must purchase the $19/mo sub before Phase 2 multi-session work; pin `devlikeapro/waha-plus` by digest.
4. **[Capacity risk]** Swap is fully exhausted and load is ~75–80% on a shared box. RAM budget fits for launch but with thin margin. Recommend host cleanup or capacity review before 48h soak. Enforce the 85% RAM / 80% disk Telegram alerts from day one.
5. **[Prod wiring]** App + WAHA should share a docker-compose network so webhooks are `http://app:3000/...` container-to-container (the pilot's `host.docker.internal` is a stand-in). WAHA gets NO public port.
6. **[Nginx SSE]** The app vhost must set `proxy_buffering off` + long `proxy_read_timeout` for the SSE stream — no existing vhost needs this, so it's a new config concern.

### Pilot teardown note
The `waha-pilot` container is left **running** so the founder can scan and complete the round-trip verify. To tear down after: `ssh contabo "docker rm -f waha-pilot && rm -rf /data/waha-pilot"`. The prod `/data/waha` dir is separate and untouched.

---

## Files (absolute paths)
- Report: `c:\Users\Junait\whatsapp-flow-main\.claude\team\PHASE0-REPORT.md`
- Founder QR: `c:\Users\Junait\whatsapp-flow-main\.claude\team\pilot-qr.png`
- On VPS: `/data/waha-pilot/.pilot-env` (API key), `/data/waha-pilot/qr.png`, `/data/waha-pilot/noweb/default/` (session)
