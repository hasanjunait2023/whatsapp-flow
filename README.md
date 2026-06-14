# What A App

**What A App** is a self-hosted, multi-channel conversational CRM for Bangladeshi
businesses — WhatsApp, Facebook Messenger & Instagram in one inbox, with order
management, AI auto-replies, and per-tenant business knowledge (RAG). It is a product
by **Ecomex**.

## Workspace layout

```
apps/web/        # Vite React SPA (dashboard, inbox, landing, admin)
apps/server/     # Hono + Drizzle (PostgreSQL) + better-auth backend
packages/shared/ # API contract types shared by web and server
supabase/        # legacy reference only (the original edge functions; superseded by apps/server)
docs/            # architecture & scaling docs (see below)
deploy/          # VPS deploy runbook + scripts
```

## Tech stack

- **Frontend:** Vite + React 18 + TypeScript, Tailwind + shadcn/ui, TanStack Query, i18next (EN/বাংলা)
- **Backend:** Hono (Node 22) + Drizzle ORM + **PostgreSQL**, better-auth (multi-tenant, organization plugin)
- **Channels:** WhatsApp (WAHA), Facebook/Instagram (Graph), Telegram
- **AI:** per-tenant LLM agents (OpenAI / Anthropic / Gemini) + **RAG** retrieval (Gemini embeddings + pgvector) — see [docs/RAG.md](docs/RAG.md)
- **Payments:** UddoktaPay (BDT) + crypto (USDT)

## Quickstart (local dev)

```sh
pnpm install                       # requires Node >= 22, pnpm 9
cp apps/server/.env.example apps/server/.env   # set AUTH_SECRET (32+ chars) and DATABASE_URL

pnpm --filter server migrate       # apply schema (drizzle)
pnpm --filter server seed          # demo tenant + owner@demo.test / demo-password-123
pnpm dev                           # web (8080) + server (3000); /api proxied in dev
```

Tests run against an in-process PGlite database, so no local Postgres is needed for `pnpm test`.

## Scripts (root)

- `pnpm dev` — web + server in parallel
- `pnpm build` — web (vite) + server (tsc)
- `pnpm test` — server + web vitest suites
- `pnpm --filter server migrate` / `seed`

The SPA talks to the backend through a drop-in supabase shim
(`apps/web/src/integrations/supabase/client.ts`), so existing call sites are unchanged.

## Docs

- [Scaling Roadmap (1 → 100k tenants)](docs/SCALING_ROADMAP.md) — phased plan for RAG, Citus sharding, queues, HA, and BDIX/EU hybrid infra.
- [RAG Layer](docs/RAG.md) — Gemini embeddings + dedicated pgvector store; how indexing and retrieval are wired into the agents.
- [Deploy Runbook](deploy/README.md) — VPS deployment, backups, rollback.
