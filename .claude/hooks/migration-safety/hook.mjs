#!/usr/bin/env node
// PreToolUse(Bash) — force a confirm before applying DB schema changes.
// `drizzle-kit push` writes schema straight to the DB with no reviewable migration
// SQL; `migrate` applies pending migrations. Both are dangerous against the prod
// VPS Postgres. We return "ask" (not deny) so the action is deliberate, not blocked.
import { readFileSync } from 'node:fs';

let cmd = '';
try {
  cmd = (JSON.parse(readFileSync(0, 'utf8')).tool_input || {}).command || '';
} catch {
  process.exit(0);
}

const ask = (reason) => {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'ask',
        permissionDecisionReason: reason,
      },
    })
  );
  process.exit(0);
};

const isPush = /drizzle-kit\s+push/.test(cmd) || /\bpnpm\b[^\n]*\bpush\b/.test(cmd);
const isMigrate = /drizzle-kit\s+migrate/.test(cmd) || /\bpnpm\b[^\n]*\bmigrate\b/.test(cmd);

if (isPush) {
  ask(
    'drizzle-kit push applies schema directly with no reviewable migration SQL — destructive on prod. Confirm DATABASE_URL is NOT production before continuing.'
  );
}
if (isMigrate) {
  ask(
    'Applying DB migrations. Confirm the target DATABASE_URL is the intended environment (dev vs prod VPS Postgres) before continuing.'
  );
}
process.exit(0);
