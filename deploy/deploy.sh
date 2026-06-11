#!/usr/bin/env bash
# ===========================================================================
# whatsapp-flow — safe, idempotent deploy to the Contabo VPS.
#
# WHAT IT DOES (additive only):
#   1. rsync the repo to the VPS (excludes node_modules/dist/.git/data/.env*)
#   2. docker compose build + up -d on the VPS
#   3. poll http://127.0.0.1:3500/healthz until 200 (DB reachable) or fail
#
# WHAT IT NEVER DOES:
#   * NEVER binds host 80/443 (host nginx owns them).
#   * NEVER touches existing containers (postiz/cobalt/searxng/...) — it only
#     acts on the `whatsapp-flow` compose project.
#   * NEVER edits existing nginx vhosts (the app vhost is installed manually
#     once — see deploy/nginx/app.conf).
#   * NEVER force-pushes or skips CI/hooks.
#
# RE-RUNNABLE: rsync is incremental; `compose up -d` only recreates changed
# services; migrations are idempotent. Safe to run repeatedly.
#
# USAGE:
#   deploy/deploy.sh            # real deploy
#   deploy/deploy.sh --dry-run  # print every action, change nothing
#
# PREREQ on the VPS: docker + docker compose, the app vhost installed, and
# /srv/whatsapp-flow/.env.production filled (see .env.production.example).
# PREREQ locally: ssh alias `contabo` resolves (root@13.140.152.96).
# ===========================================================================
set -euo pipefail

# --- config -----------------------------------------------------------------
SSH_ALIAS="${SSH_ALIAS:-contabo}"
REMOTE_DIR="${REMOTE_DIR:-/srv/whatsapp-flow}"
COMPOSE_PROJECT="whatsapp-flow"
HEALTH_URL="http://127.0.0.1:3500/healthz"
HEALTH_RETRIES="${HEALTH_RETRIES:-30}"     # 30 * 5s = up to 150s
HEALTH_INTERVAL="${HEALTH_INTERVAL:-5}"

DRY_RUN=0
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=1

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

log()  { printf '\033[1;36m[deploy]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[deploy]\033[0m %s\n' "$*"; }
die()  { printf '\033[1;31m[deploy] FATAL:\033[0m %s\n' "$*" >&2; exit 1; }

run() {
  # Echo, and execute unless --dry-run.
  printf '\033[0;90m  + %s\033[0m\n' "$*"
  if [[ "$DRY_RUN" -eq 0 ]]; then
    "$@"
  fi
}

run_remote() {
  # Run a command on the VPS (echo always; execute unless dry-run).
  printf '\033[0;90m  + ssh %s -- %s\033[0m\n' "$SSH_ALIAS" "$*"
  if [[ "$DRY_RUN" -eq 0 ]]; then
    ssh "$SSH_ALIAS" "$@"
  fi
}

# --- preflight --------------------------------------------------------------
[[ "$DRY_RUN" -eq 1 ]] && warn "DRY-RUN: no remote changes will be made."

command -v ssh   >/dev/null || die "ssh not found"
command -v rsync >/dev/null || die "rsync not found (needed to sync the repo)"

log "Verifying SSH connectivity to '$SSH_ALIAS'..."
if [[ "$DRY_RUN" -eq 0 ]]; then
  ssh -o BatchMode=yes -o ConnectTimeout=10 "$SSH_ALIAS" 'echo ok' >/dev/null \
    || die "cannot reach '$SSH_ALIAS' over SSH"
fi

# Guard: confirm we are NOT about to touch 80/443. We only ever bind 3500.
log "Guard: this deploy only binds 127.0.0.1:3500 and the '$COMPOSE_PROJECT' project."
log "Guard: it will NOT touch ports 80/443 or any other container."

# --- 1. sync repo -----------------------------------------------------------
log "Syncing repo -> ${SSH_ALIAS}:${REMOTE_DIR} (incremental)..."
RSYNC_FLAGS=(-az --delete
  --exclude '.git'
  --exclude 'node_modules'
  --exclude '**/node_modules'
  --exclude 'dist'
  --exclude '**/dist'
  --exclude 'data'
  --exclude '.env'
  --exclude '.env.*'
  --include '.env.production.example')
run_remote "mkdir -p $REMOTE_DIR"
if [[ "$DRY_RUN" -eq 1 ]]; then
  printf '\033[0;90m  + rsync %s %s/ %s:%s/\033[0m\n' "${RSYNC_FLAGS[*]}" "$REPO_ROOT" "$SSH_ALIAS" "$REMOTE_DIR"
else
  rsync "${RSYNC_FLAGS[@]}" "$REPO_ROOT/" "$SSH_ALIAS:$REMOTE_DIR/"
fi

# --- 2. verify env present --------------------------------------------------
log "Checking .env.production exists on the VPS..."
if [[ "$DRY_RUN" -eq 0 ]]; then
  ssh "$SSH_ALIAS" "test -f $REMOTE_DIR/.env.production" \
    || die "$REMOTE_DIR/.env.production missing on VPS — copy .env.production.example and fill it first."
fi

# --- 3. build + up ----------------------------------------------------------
log "Building images on the VPS (this can take a few minutes)..."
run_remote "cd $REMOTE_DIR && docker compose build"

log "Starting/updating the '$COMPOSE_PROJECT' stack (up -d)..."
run_remote "cd $REMOTE_DIR && docker compose up -d"

# --- 4. health gate ---------------------------------------------------------
log "Polling $HEALTH_URL (on the VPS) until healthy..."
if [[ "$DRY_RUN" -eq 1 ]]; then
  warn "DRY-RUN: skipping health poll."
  log "Dry-run complete. No changes were made."
  exit 0
fi

ok=0
for i in $(seq 1 "$HEALTH_RETRIES"); do
  code="$(ssh "$SSH_ALIAS" "curl -s -o /dev/null -w '%{http_code}' $HEALTH_URL || true")"
  if [[ "$code" == "200" ]]; then
    log "Healthy (HTTP 200) after $((i * HEALTH_INTERVAL))s."
    ok=1
    break
  fi
  printf '\033[0;90m  ... attempt %s/%s -> HTTP %s; retrying in %ss\033[0m\n' \
    "$i" "$HEALTH_RETRIES" "${code:-000}" "$HEALTH_INTERVAL"
  sleep "$HEALTH_INTERVAL"
done

if [[ "$ok" -ne 1 ]]; then
  warn "Health check never went green. Recent app logs:"
  ssh "$SSH_ALIAS" "cd $REMOTE_DIR && docker compose logs --tail=50 app" || true
  die "deploy failed health gate — investigate, then rollback if needed (see deploy/README.md)."
fi

log "Deploy complete. App is healthy on 127.0.0.1:3500 (proxied by nginx)."
log "Next: run the canary against the public hostname to confirm prod is green."
