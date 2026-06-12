#!/usr/bin/env bash
# ===========================================================================
# Litestream restore drill — proves the off-VPS SQLite backup is restorable.
#
# Run this ON THE VPS after R2 credentials are filled in .env.production and
# the litestream container has been replicating for at least a few minutes
# (so a generation + snapshot exist in R2).
#
# WHAT IT DOES (read-only against prod):
#   1. Restores the latest replica from R2 into a THROWAWAY temp file
#      (never touches the live /data/sqlite/app.db).
#   2. Runs `PRAGMA integrity_check` on the restored copy.
#   3. Prints a couple of table row counts as a sanity signal.
#   4. Deletes the temp file.
#
# It does NOT modify the live DB, the replica, or any container.
#
# USAGE (on the VPS, from the compose project dir):
#   bash deploy/restore-drill.sh
# ===========================================================================
set -euo pipefail

REMOTE_DIR="${REMOTE_DIR:-/srv/whatsapp-flow}"
LITESTREAM_IMAGE="${LITESTREAM_IMAGE:-litestream/litestream:0.3.14}"
TMP_DB="/tmp/restore-drill-$$.db"

cd "$REMOTE_DIR"

echo "[drill] Restoring latest replica from R2 into $TMP_DB (throwaway)..."
# One-off litestream container: same config + env_file as the running replica,
# but restoring to a temp path. -if-replica-exists keeps it from erroring when
# the bucket is empty (so the message is friendlier on a fresh setup).
docker run --rm \
  --env-file "$REMOTE_DIR/.env.production" \
  -v "$REMOTE_DIR/litestream.yml:/etc/litestream.yml:ro" \
  -v /tmp:/tmp \
  "$LITESTREAM_IMAGE" \
  restore -config /etc/litestream.yml -if-replica-exists -o "$TMP_DB" /data/sqlite/app.db

if [[ ! -f "$TMP_DB" ]]; then
  echo "[drill] FAIL: no replica restored. Either litestream hasn't snapshotted yet,"
  echo "[drill]       or R2 creds/bucket are wrong. Check: docker compose logs litestream"
  exit 1
fi

echo "[drill] Restored. Running integrity check..."
# Use the app image (has the better-sqlite3 native binding) but override the
# entrypoint so it does NOT boot the server (which would demand AUTH_SECRET etc.)
# — we only want a throwaway node process to open + check the restored copy.
RESULT="$(docker run --rm --entrypoint node -v /tmp:/tmp whatsapp-flow:latest -e "
const Database = require(process.cwd()+'/node_modules/better-sqlite3');
const db = new Database('$TMP_DB', { readonly: true });
const ok = db.prepare('PRAGMA integrity_check').get();
let tenants = 0, users = 0;
try { tenants = db.prepare('SELECT COUNT(*) n FROM tenants').get().n; } catch {}
try { users = db.prepare('SELECT COUNT(*) n FROM user').get().n; } catch {}
console.log(JSON.stringify({ integrity: ok, tenants, users }));
db.close();
")"

echo "[drill] $RESULT"
rm -f "$TMP_DB"

if echo "$RESULT" | grep -q '"integrity_check":"ok"'; then
  echo "[drill] PASS: replica restores and passes integrity_check."
else
  echo "[drill] WARN: restored but integrity_check not 'ok' — inspect above."
  exit 1
fi
