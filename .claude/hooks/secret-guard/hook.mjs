#!/usr/bin/env node
// PreToolUse(Bash) — block staging real .env files.
// Root .env holds live secrets (Postgres, better-auth, web-push). gitignore is the
// primary defense; this catches an explicit `git add .env` slip. Fail-open by design.
import { readFileSync } from 'node:fs';

let cmd = '';
try {
  cmd = (JSON.parse(readFileSync(0, 'utf8')).tool_input || {}).command || '';
} catch {
  process.exit(0); // no/invalid stdin → allow
}

if (/\bgit\s+add\b/.test(cmd)) {
  const refs = cmd.match(/\.env[\w.-]*/g) || [];
  const bad = refs.filter((t) => !/\.example$/.test(t));
  if (bad.length) {
    process.stdout.write(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          permissionDecision: 'deny',
          permissionDecisionReason: `Refusing to git add ${bad[0]} — .env files hold live secrets (Postgres, better-auth, web-push). Commit .env.example instead.`,
        },
      })
    );
  }
}
process.exit(0);
