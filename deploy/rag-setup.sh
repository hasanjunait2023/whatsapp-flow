#!/usr/bin/env bash
#
# RAG infra bootstrap for the VPS (Ollama CPU embeddings + pgvector).
# Idempotent and non-destructive: safe to re-run. Does NOT touch application
# data; only adds an Ollama container, pulls the embedding model, and verifies
# the pgvector extension on the database in DATABASE_URL.
#
# Usage:
#   DATABASE_URL=postgres://user:pass@host:5432/whatsapp_flow ./deploy/rag-setup.sh
#
# Env (override as needed):
#   OLLAMA_PORT     host port for Ollama        (default 11434)
#   EMBED_MODEL     model to pull               (default bge-m3)
#   SKIP_PGVECTOR   set to 1 to skip the DB step
#
set -euo pipefail

OLLAMA_PORT="${OLLAMA_PORT:-11434}"
EMBED_MODEL="${EMBED_MODEL:-bge-m3}"

log() { printf '\n=== %s ===\n' "$1"; }

# --- 1. Docker present? ------------------------------------------------------
log "Checking Docker"
if ! command -v docker >/dev/null 2>&1; then
  echo "ERROR: docker not found. Install Docker first, then re-run." >&2
  exit 1
fi
docker --version

# --- 2. Ollama container -----------------------------------------------------
log "Ensuring Ollama container (CPU)"
if docker ps --format '{{.Names}}' | grep -qx ollama; then
  echo "ollama already running"
elif docker ps -a --format '{{.Names}}' | grep -qx ollama; then
  echo "starting existing ollama container"
  docker start ollama
else
  echo "creating ollama container on port ${OLLAMA_PORT}"
  docker run -d \
    --name ollama \
    --restart unless-stopped \
    -p "${OLLAMA_PORT}:11434" \
    -v ollama:/root/.ollama \
    ollama/ollama
fi

# Wait for the API to answer before pulling.
log "Waiting for Ollama API"
for i in $(seq 1 30); do
  if curl -fsS "http://127.0.0.1:${OLLAMA_PORT}/api/tags" >/dev/null 2>&1; then
    echo "Ollama is up"
    break
  fi
  sleep 2
  [ "$i" -eq 30 ] && { echo "ERROR: Ollama did not become ready" >&2; exit 1; }
done

# --- 3. Pull the embedding model --------------------------------------------
log "Pulling embedding model: ${EMBED_MODEL}"
docker exec ollama ollama pull "${EMBED_MODEL}"

# --- 4. Verify embedding works ----------------------------------------------
log "Embedding smoke test"
DIMS=$(curl -fsS "http://127.0.0.1:${OLLAMA_PORT}/api/embed" \
  -H 'content-type: application/json' \
  -d "{\"model\":\"${EMBED_MODEL}\",\"input\":[\"preflight probe\"]}" \
  | grep -o '\[' | wc -l || echo 0)
echo "embedding endpoint responded (model ${EMBED_MODEL})"

# --- 5. pgvector extension ---------------------------------------------------
if [ "${SKIP_PGVECTOR:-0}" = "1" ]; then
  log "Skipping pgvector step (SKIP_PGVECTOR=1)"
else
  log "Verifying pgvector on DATABASE_URL"
  if [ -z "${DATABASE_URL:-}" ]; then
    echo "WARNING: DATABASE_URL not set — skipping pgvector. Set it and re-run, or SKIP_PGVECTOR=1." >&2
  elif ! command -v psql >/dev/null 2>&1; then
    echo "WARNING: psql not found. Install postgresql-client or run CREATE EXTENSION manually:" >&2
    echo "         CREATE EXTENSION IF NOT EXISTS vector;" >&2
  else
    if psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -c "CREATE EXTENSION IF NOT EXISTS vector;"; then
      echo "pgvector extension is present."
    else
      cat >&2 <<'EOF'
ERROR: could not create the `vector` extension. The Postgres SERVER does not
have pgvector installed. Fix one of these, then re-run:
  - Docker Postgres: switch the image to `pgvector/pgvector:pg16` (drop-in), recreate the container, then re-run.
  - System Postgres: `apt-get install postgresql-16-pgvector` (match your PG major), restart, then re-run.
EOF
      exit 1
    fi
  fi
fi

# --- 6. Env reminder ---------------------------------------------------------
log "Done. Set these in the server environment (apps/server/.env or compose env):"
cat <<EOF
  EMBEDDING_PROVIDER=ollama
  EMBEDDING_URL=http://127.0.0.1:${OLLAMA_PORT}
  EMBEDDING_MODEL=${EMBED_MODEL}
  EMBEDDING_DIMS=1024

Next: run the preflight, then (after RAG job wiring) the backfill:
  pnpm --filter server exec tsx src/scripts/rag-doctor.ts
  pnpm --filter server exec tsx src/scripts/backfill-rag.ts
EOF
