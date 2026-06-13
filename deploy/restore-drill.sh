#!/usr/bin/env bash
# ===========================================================================
# Postgres restore drill — proves the off-VPS pg_dump backup in R2 is restorable.
#
# Run this ON THE VPS after R2 creds are filled in .env.production and the
# pg-backup + restic-backup containers have run at least once (so a dump exists
# in the pg_backup volume and a restic snapshot exists in R2).
#
# WHAT IT DOES (read-only against prod):
#   1. restic-restores the latest snapshot's /backup dir into a throwaway temp dir.
#   2. gunzip -t the newest whatsapp_flow_*.sql.gz (gzip integrity).
#   3. Restores that dump into a THROWAWAY database (whatsapp_flow_drill) on the
#      shared postiz-postgres, counts a couple of tables, then DROPS it.
#   4. Cleans up the temp dir.
#
# It never touches the live `whatsapp_flow` database, the R2 repo, or any
# running container's data.
#
# USAGE (on the VPS, from the compose project dir):
#   bash deploy/restore-drill.sh
# ===========================================================================
set -euo pipefail

REMOTE_DIR="${REMOTE_DIR:-/srv/whatsapp-flow}"
RESTIC_IMAGE="${RESTIC_IMAGE:-restic/restic:0.17.3}"
PG_CONTAINER="${PG_CONTAINER:-postiz-postgres}"
PG_SUPERUSER="${PG_SUPERUSER:-postiz-user}"
DRILL_DB="whatsapp_flow_drill"
TMP_DIR="/tmp/pg-restore-drill-$$"

cd "$REMOTE_DIR"
mkdir -p "$TMP_DIR"
# shellcheck disable=SC1091
set -a; . "$REMOTE_DIR/.env.production"; set +a

echo "[drill] restic-restoring latest /backup snapshot into $TMP_DIR ..."
docker run --rm \
  --env-file "$REMOTE_DIR/.env.production" \
  -v "$TMP_DIR:$TMP_DIR" \
  "$RESTIC_IMAGE" \
  restore latest --include /backup --target "$TMP_DIR"

DUMP="$(ls -t "$TMP_DIR"/backup/whatsapp_flow_*.sql.gz 2>/dev/null | head -1 || true)"
if [[ -z "$DUMP" ]]; then
  echo "[drill] FAIL: no whatsapp_flow_*.sql.gz in the restored snapshot."
  echo "[drill]       Either pg-backup hasn't run yet or restic has no snapshot."
  rm -rf "$TMP_DIR"; exit 1
fi
echo "[drill] newest dump: $DUMP"

echo "[drill] verifying gzip integrity..."
gunzip -t "$DUMP"

echo "[drill] restoring into throwaway db $DRILL_DB on $PG_CONTAINER ..."
docker exec -i "$PG_CONTAINER" psql -U "$PG_SUPERUSER" -d postgres -v ON_ERROR_STOP=1 \
  -c "DROP DATABASE IF EXISTS $DRILL_DB" -c "CREATE DATABASE $DRILL_DB"
gunzip -c "$DUMP" | docker exec -i "$PG_CONTAINER" psql -U "$PG_SUPERUSER" -d "$DRILL_DB" -q

TENANTS="$(docker exec -i "$PG_CONTAINER" psql -U "$PG_SUPERUSER" -d "$DRILL_DB" -tAc 'SELECT COUNT(*) FROM tenants' 2>/dev/null || echo '?')"
USERS="$(docker exec -i "$PG_CONTAINER" psql -U "$PG_SUPERUSER" -d "$DRILL_DB" -tAc 'SELECT COUNT(*) FROM "user"' 2>/dev/null || echo '?')"
echo "[drill] restored row counts — tenants=$TENANTS users=$USERS"

echo "[drill] dropping throwaway db..."
docker exec -i "$PG_CONTAINER" psql -U "$PG_SUPERUSER" -d postgres -c "DROP DATABASE IF EXISTS $DRILL_DB" >/dev/null
rm -rf "$TMP_DIR"

if [[ "$TENANTS" != "?" && "$USERS" != "?" ]]; then
  echo "[drill] PASS: dump restores into a fresh database and tables are queryable."
else
  echo "[drill] WARN: restored but a sanity query failed — inspect above."
  exit 1
fi
