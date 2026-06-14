#!/usr/bin/env bash
#
# RAG infra bootstrap for the VPS: a DEDICATED pgvector Postgres container that
# holds embedding_chunks, kept off the shared/RAM-constrained postiz-postgres.
# Idempotent and additive — safe to re-run, does not touch the app or postiz.
#
# Embeddings themselves use a managed API (Gemini) — see docs/RAG.md — so no
# embedding server runs on this box (it has no spare RAM/GPU).
#
# Run on the VPS:  bash deploy/rag-setup.sh
#
set -euo pipefail

NET="${RAG_NET:-whatsapp-flow_wf_net}"   # network the app is on
NAME="${RAG_NAME:-whatsapp-flow-ragdb}"
VOL="${RAG_VOL:-wf_ragdb_data}"
IMG="${RAG_IMG:-pgvector/pgvector:pg17}"
ENV_FILE="${RAG_ENV_FILE:-/srv/whatsapp-flow/.rag.env}"

if docker ps -a --format '{{.Names}}' | grep -qx "$NAME"; then
  echo "ragdb container already exists — skipping create"
else
  echo "pulling $IMG ..."
  docker pull "$IMG" >/dev/null
  RAGPASS=$(openssl rand -hex 24)
  docker volume create "$VOL" >/dev/null
  docker run -d --name "$NAME" --restart unless-stopped \
    --network "$NET" --network-alias ragdb \
    -e POSTGRES_USER=rag -e POSTGRES_PASSWORD="$RAGPASS" -e POSTGRES_DB=rag \
    -v "$VOL":/var/lib/postgresql/data \
    "$IMG" >/dev/null
  umask 077
  echo "RAG_DATABASE_URL=postgres://rag:${RAGPASS}@ragdb:5432/rag" > "$ENV_FILE"
  echo "created ragdb + wrote $ENV_FILE (root-only; password not echoed)"
fi

# Wait for real query readiness (the official image restarts PG after initdb,
# so pg_isready can report ready against the temporary init server too early).
for i in $(seq 1 30); do
  if docker exec "$NAME" psql -U rag -d rag -tAc "SELECT 1" >/dev/null 2>&1; then
    echo "ragdb accepting queries"; break
  fi
  sleep 2
  [ "$i" -eq 30 ] && { echo "ERROR: ragdb did not become ready" >&2; exit 1; }
done

docker exec "$NAME" psql -U rag -d rag -tAc "CREATE EXTENSION IF NOT EXISTS vector;" >/dev/null
docker exec "$NAME" psql -U rag -d rag -tAc \
  "SELECT 'pgvector ' || extversion FROM pg_extension WHERE extname='vector';"

cat <<EOF

ragdb ready. Add to the app environment (RAG_DATABASE_URL is in $ENV_FILE):
  EMBEDDING_PROVIDER=gemini
  EMBEDDING_MODEL=gemini-embedding-001
  EMBEDDING_DIMS=768
  GEMINI_API_KEY=<your key>
  RAG_DATABASE_URL=<from $ENV_FILE>

Then redeploy the app image (with the RAG code) and run:
  pnpm --filter server exec tsx src/scripts/rag-doctor.ts
  pnpm --filter server exec tsx src/scripts/backfill-rag.ts
EOF
