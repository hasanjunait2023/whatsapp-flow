#!/bin/sh
# ---------------------------------------------------------------------------
# Container entrypoint: run Drizzle migrations, then start the server.
#
# This is a FRESH-LAUNCH flow against Postgres (db `whatsapp_flow` on the shared
# postiz-postgres instance, reached via DATABASE_URL). On first boot the schema
# is empty, so runMigrations() applies drizzle/*.sql to create it. On subsequent
# boots it is idempotent (drizzle tracks applied migrations in its
# __drizzle_migrations table), so re-running is safe.
#
# runMigrations() uses the node-postgres migrator (a prod dependency), so it
# works in the pruned production image where drizzle-kit (a dev dep) is absent.
# migrate.js resolves its migrations folder relative to its own __dirname
# (dist/src/db -> ../../drizzle == dist/drizzle), so cwd does not matter.
# ---------------------------------------------------------------------------
set -e

echo "[entrypoint] running migrations against Postgres..."

# Invoke the exported (async) runMigrations() from the compiled migrate module.
node --input-type=module -e "import('./dist/src/db/migrate.js').then(m => m.runMigrations()).then(() => console.log('[entrypoint] migrations applied')).catch(err => { console.error('[entrypoint] migration failed:', err); process.exit(1); });"

echo "[entrypoint] starting server on port ${PORT:-3500}..."
exec node dist/src/index.js
