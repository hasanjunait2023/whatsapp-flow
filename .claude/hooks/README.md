# Claude Code hooks

Each hook is a self-contained Node script (Node 22, no bash/python dependency — portable
on Windows + Linux). Wired in `.claude/settings.json`. All read the tool-call JSON from
stdin and emit a `hookSpecificOutput` decision on stdout, or exit 0 to allow.

| Folder | Event | Decision | Purpose |
|--------|-------|----------|---------|
| `secret-guard/` | PreToolUse(Bash) | deny | Block `git add` of a real `.env*` file (allows `.env.example`). |
| `pnpm-enforce/` | PreToolUse(Bash) | deny | Block `npm`/`yarn`/`bun` installs — pnpm@9.12 workspace only. |
| `migration-safety/` | PreToolUse(Bash) | ask | Confirm before `drizzle-kit push` / `migrate` (prod-DB risk). |

Design notes:
- Fail-open: any parse error or unmatched command → `exit 0` (allow). These are guard
  rails, not the only line of defense.
- `secret-guard` only gates `git add` (the staging gate); `.env*` is gitignored, so
  `git commit -a` cannot pick it up. Avoids false positives on commit messages.
- `migration-safety` returns `ask` (not `deny`) so intentional migrations still run after
  a deliberate confirm.

Test a hook manually:

```sh
echo '{"tool_input":{"command":"git add .env"}}' | node .claude/hooks/secret-guard/hook.mjs
echo '{"tool_input":{"command":"npm install foo"}}' | node .claude/hooks/pnpm-enforce/hook.mjs
echo '{"tool_input":{"command":"pnpm --filter server push"}}' | node .claude/hooks/migration-safety/hook.mjs
```
