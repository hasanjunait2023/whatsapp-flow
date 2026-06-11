#!/bin/sh
# ---------------------------------------------------------------------------
# Container entrypoint: run Drizzle migrations, then start the server.
#
# This is a FRESH-LAUNCH flow: on first boot the SQLite DB at $DB_PATH does not
# exist, so runMigrations() creates the full schema from drizzle/*.sql. On
# subsequent boots it is idempotent (drizzle tracks applied migrations in its
# __drizzle_migrations table), so re-running is safe.
#
# migrate.js resolves its migrations folder relative to its own __dirname
# (dist/src/db -> ../../drizzle == dist/drizzle), so cwd does not matter.
# ---------------------------------------------------------------------------
set -e

echo "[entrypoint] DB_PATH=${DB_PATH:-/data/sqlite/app.db}"
echo "[entrypoint] running migrations..."

# Invoke the exported runMigrations() from the compiled migrate module.
# (migrate.js only self-invokes when run as 'migrate.ts' under tsx, so we
#  call it explicitly here for the compiled .js.)
node --input-type=module -e "import('./dist/src/db/migrate.js').then(m => { m.runMigrations(); console.log('[entrypoint] migrations applied'); }).catch(err => { console.error('[entrypoint] migration failed:', err); process.exit(1); });"

echo "[entrypoint] starting server on port ${PORT:-3500}..."
exec node dist/src/index.js
