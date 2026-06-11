# DECISIONS

- 2026-06-11 — CHARTER: mission set from founder request + 4 research PDFs. Research dispatched (codebase exploration + WAHA/SQLite/Contabo brief).
- 2026-06-11 — Founder chose **full SQLite rewrite** over self-hosted Supabase (cost warning given and accepted).
- 2026-06-11 — **WAHA Plus** ($19/mo), NOWEB engine, pinned stable tag. Core insufficient (1 session, no media send).
- 2026-06-11 — **Live data migration** required (real tenants in Supabase cloud project cdkrvztqeuflxilrtnws).
- 2026-06-11 — Target = existing Contabo VPS (ssh alias `contabo`, 6 vCPU/12GB, shared with postiz/cobalt/searxng; 80/443 owned by existing proxy).
- 2026-06-11 — Stack: Node 22 + Hono + Drizzle + better-sqlite3 (WAL) + better-auth(org plugin) + SSE realtime + node-cron jobs + local-disk media. Frontend untouched via supabase-client shim.
- 2026-06-11 — Single shared SQLite DB (not per-tenant files) — admin cross-tenant queries + impersonation.
- 2026-06-11 — Auth migration: bcrypt verify + rehash-on-first-login; forced reset only on unverifiable hashes.
- 2026-06-11 — Backups: Cloudflare R2 (Litestream SQLite WAL + restic media/WAHA sessions).
- 2026-06-11 — Ban policy: reactive-first, <30 proactive/hr/number, warm-up, tenant ToS disclosure.
- 2026-06-11 — v1 deferrals approved (Accounting, Internal Chat, Scheduled Reports, Marketing Sequences, Woo, Service Boards, bulk Group tooling) — flagged, ported Phase 7.
- 2026-06-11 — GATE 1 PASSED: plan approved by founder via ExitPlanMode.
- 2026-06-11 — Dispatched Phase 0 (devops-deployer) + Phase 1 (backend-engineer) in parallel; Phase 0 pilots with WAHA Core (free, 1 session) to measure RSS before founder buys Plus.
