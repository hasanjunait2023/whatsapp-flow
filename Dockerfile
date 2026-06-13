# syntax=docker/dockerfile:1.7
# ---------------------------------------------------------------------------
# whatsapp-flow — production image
#
# Multi-stage build for the pnpm monorepo:
#   apps/web    (Vite + React SPA)   -> apps/web/dist
#   apps/server (Hono + Node 22 + better-sqlite3 + Drizzle)
#
# The server serves the built SPA (see apps/server/src/index.ts: when
# IS_PRODUCTION and WEB_DIST_DIR exists it mounts serveStatic on /*), runs
# Drizzle migrations on start against a FRESH SQLite DB, and exposes /healthz
# (which does `SELECT 1` against the DB — so a green healthcheck == DB reachable).
#
# Runtime layout inside the image:
#   /app/apps/server/dist/src/index.js   <- server entry (node dist/src/index.js)
#   /app/apps/server/dist/drizzle/*.sql  <- migrations, resolved by migrate.js via __dirname
#   /app/apps/web/dist/                  <- SPA served by the server
#   /data/sqlite/app.db                  <- persisted SQLite (WAL) (volume)
#   /data/media/                         <- persisted tenant media (volume)
# ---------------------------------------------------------------------------

ARG NODE_VERSION=22-bookworm-slim

# ===========================================================================
# Stage 1: base — pnpm enabled, workspace manifests only (cache-friendly)
# ===========================================================================
FROM node:${NODE_VERSION} AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /app

# Copy only the files needed to resolve+install the workspace first so the
# install layer is cached unless a manifest or the lockfile changes.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json        apps/web/package.json
COPY apps/server/package.json     apps/server/package.json
COPY packages/shared/package.json packages/shared/package.json

# ===========================================================================
# Stage 2: builder — full deps (incl. native toolchain) + build web & server
# ===========================================================================
FROM base AS builder

# Postgres (pg) is pure JS and PGlite (tests only) is WASM — no native addon
# build is needed at image build time, so no python3/make/g++ toolchain here.

# Install ALL workspace deps (dev included — tsc/vite live in devDependencies).
# --no-frozen-lockfile lets the Linux build refresh the lockfile from the
# manifests (the local Windows pnpm cannot write its store on this box, so the
# committed lockfile may lag package.json; the VPS build is the source of truth).
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --no-frozen-lockfile

# Bring in the full source and build both apps.
COPY . .

# Web SPA -> apps/web/dist ; Server -> apps/server/dist (tsc, rootDir ".")
RUN pnpm --filter web build \
 && pnpm --filter server build

# migrate.js resolves its migrations folder as `<dist>/src/db/../../drizzle`
# i.e. apps/server/dist/drizzle — tsc does not copy .sql, so copy them in.
RUN cp -r apps/server/drizzle apps/server/dist/drizzle

# Produce a pruned, production-only dependency tree for the server.
# pnpm 9 (this repo: packageManager pnpm@9.12.0) supports `deploy --prod`
# directly — no --legacy / inject-workspace-packages (those are pnpm 10).
# `@whatsapp-flow/shared` is consumed type-only, so it is not a runtime dep;
# the pruned tree carries only the server's prod deps (incl. better-sqlite3).
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm --filter server deploy --prod /app/server-deploy

# ===========================================================================
# Stage 3: runtime — lean Node 22, no build toolchain, non-root
# ===========================================================================
FROM node:${NODE_VERSION} AS runtime
ENV NODE_ENV=production
WORKDIR /app

# tini for correct PID-1 signal handling (the server installs SIGTERM/SIGINT
# handlers for graceful shutdown; tini reaps and forwards them).
RUN apt-get update && apt-get install -y --no-install-recommends tini \
    && rm -rf /var/lib/apt/lists/*

# Pruned prod node_modules (with the natively-built better-sqlite3) from
# `pnpm deploy`; the compiled server (dist, incl. dist/drizzle) is taken
# straight from the authoritative build output so correctness does not depend
# on pnpm deploy's file-copy heuristics.
COPY --from=builder /app/server-deploy/node_modules ./apps/server/node_modules
COPY --from=builder /app/apps/server/dist           ./apps/server/dist
COPY --from=builder /app/apps/server/package.json   ./apps/server/package.json

# Built SPA — lands where the server's WEB_DIST_DIR points (../web/dist
# relative to the server cwd /app/apps/server).
COPY --from=builder /app/apps/web/dist ./apps/web/dist

# Entrypoint: run migrations against the (fresh) DB, then start the server.
COPY --chmod=0755 deploy/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

# Persisted state lives outside the image on named volumes.
#   DATABASE_URL -> Postgres (whatsapp_flow on postiz-postgres), set in .env.production
#   MEDIA_DIR    -> /data/media
#   WEB_DIST_DIR -> absolute, so cwd-independence is guaranteed
ENV MEDIA_DIR=/data/media \
    WEB_DIST_DIR=/app/apps/web/dist \
    PORT=3500

# Create the data dir and hand the app a non-root user. The named volume
# is chowned to this uid by the entrypoint on first boot.
RUN mkdir -p /data/media \
 && groupadd --system --gid 1001 nodeapp \
 && useradd  --system --uid 1001 --gid nodeapp nodeapp \
 && chown -R nodeapp:nodeapp /data /app

WORKDIR /app/apps/server
USER nodeapp

EXPOSE 3500

# Container-level healthcheck mirrors the compose one; hits /healthz which
# does a real `SELECT 1` (200 == DB reachable, 503 == degraded).
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3500)+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/usr/bin/tini", "--", "/usr/local/bin/docker-entrypoint.sh"]
