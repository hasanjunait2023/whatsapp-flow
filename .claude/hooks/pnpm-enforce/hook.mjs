#!/usr/bin/env node
// PreToolUse(Bash) — enforce pnpm in this pnpm@9.12 workspace.
// npm/yarn/bun installs corrupt the lockfile and the workspace symlink layout.
// `\bnpm\b` does not match inside `pnpm` (no word boundary), so pnpm passes through.
import { readFileSync } from 'node:fs';

let cmd = '';
try {
  cmd = (JSON.parse(readFileSync(0, 'utf8')).tool_input || {}).command || '';
} catch {
  process.exit(0);
}

// install-type commands only — leaves `npm run`, `npx` alone
const blocked = /\b(npm\s+(i|install|ci|add)|yarn(\s+(add|install))?|bun\s+(add|install))\b/.test(cmd);

if (blocked) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason:
          'Use pnpm — this is a pnpm@9.12.0 workspace (node>=22). npm/yarn/bun break the lockfile. Try: pnpm install, or pnpm add <pkg> -F server|web.',
      },
    })
  );
}
process.exit(0);
