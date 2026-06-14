# RAG Layer (P1) — Gemini Embeddings + dedicated pgvector

Phase 1 of the [Scaling Roadmap](SCALING_ROADMAP.md). Gives the AI agents
retrieval over each tenant's own business knowledge: **Gemini API** embeddings
(`gemini-embedding-001`, strong Bengali, zero VPS RAM) stored in a **dedicated
`pgvector` container** (the shared app Postgres has no pgvector and the box is
RAM-bound). The embedding provider is swappable — self-hosted BGE-M3 (TEI/Ollama)
moves in at roadmap P5 on a GPU box via env only.

Everything runs on the **VPS**. Nothing here needs local installation.

---

## What shipped (code)

All additive, conflict-free with the in-flight SQLite→Postgres migration. New files only:

| File | Purpose |
|------|---------|
| `apps/server/src/embeddings/types.ts` | `EmbeddingClient` interface, env-driven `EMBEDDING_DIMS` |
| `apps/server/src/embeddings/providers/gemini.ts` | Gemini client (`batchEmbedContents`) — **P1 default** |
| `apps/server/src/embeddings/providers/tei.ts` | TEI HTTP client (self-hosted BGE-M3, later) |
| `apps/server/src/embeddings/providers/ollama.ts` | Ollama client (self-hosted, later) |
| `apps/server/src/embeddings/registry.ts` | `resolveEmbeddingClient()` from env + deterministic `fakeClient` for tests |
| `apps/server/src/services/rag/db.ts` | `ragQuery()` — dedicated pgvector DB (RAG_DATABASE_URL) or app-DB fallback |
| `apps/server/src/services/rag/schema.ts` | `ensureRagSchema()` — idempotent DDL (extension + table + indexes) |
| `apps/server/src/services/rag/chunk.ts` | `chunkText()` — paragraph-packed windows + overlap |
| `apps/server/src/services/rag/vector.ts` | pgvector literal `[]` serialise/parse |
| `apps/server/src/services/rag/index.ts` | `indexSource()`, `retrieveContext()`, `formatContext()` |
| `apps/server/src/services/rag/job.ts` | `RAG_INDEX_JOB` + `ragIndexHandler` (registered in soul jobs) |
| `apps/server/test/rag-unit.test.ts` | pure-logic tests (no DB) |
| `apps/server/test/rag-db.test.ts` | DB integration, self-skips without pgvector |

**Design note:** `ensureRagSchema()` runs the DDL lazily and idempotently instead of a
drizzle migration, on purpose — the drizzle journal is owned by the concurrent Postgres
migration. Fold it into a generated migration once that settles.

`embedding_chunks` schema:

```
id uuid PK | tenant_id text | source_type text | source_id text
chunk_index int | chunk_text text | embedding vector(EMBEDDING_DIMS) | created_at timestamptz
INDEX (tenant_id) · UNIQUE (tenant_id, source_type, source_id, chunk_index)
HNSW (embedding vector_cosine_ops)   -- best-effort
```

Retrieval is one statement — tenant isolation and vector search together:

```sql
SELECT chunk_text FROM embedding_chunks
WHERE tenant_id = $1
ORDER BY embedding <=> $2::vector
LIMIT $3;
```

---

## Architecture on this VPS

The Contabo box is RAM-bound (≈1.5 GB free) and its app DB is the shared
`postiz-postgres` (`postgres:17-alpine`, no pgvector). So at P1:

- **Vectors → a dedicated `pgvector/pgvector:pg17` container** (`whatsapp-flow-ragdb`,
  ~40 MB), on the `whatsapp-flow_wf_net` network, reachable as host `ragdb`. Keeps
  vectors off the shared DB; no restart of postiz-postgres. The app points at it via
  `RAG_DATABASE_URL`; `ragQuery()` falls back to the app DB only when that's unset.
- **Embeddings → Gemini API** (`gemini-embedding-001`, 768-dim, strong Bengali). Zero VPS
  RAM/GPU. Self-hosted BGE-M3 (TEI/Ollama providers already in the abstraction) moves in
  at roadmap P5 on a dedicated GPU box — an env change, no code change.

### Provision the vector DB

Already provisioned on the VPS by `deploy/rag-setup.sh` (idempotent). It created the
container, enabled `vector`, and wrote `RAG_DATABASE_URL` to `/srv/whatsapp-flow/.rag.env`
(root-only). Re-run the script to recreate if needed.

### Server environment (app)

```bash
EMBEDDING_PROVIDER=gemini
EMBEDDING_MODEL=gemini-embedding-001
EMBEDDING_DIMS=768
GEMINI_API_KEY=<your key>          # free from aistudio.google.com; no platform key existed
RAG_DATABASE_URL=<from /srv/whatsapp-flow/.rag.env>
```

In tests `EMBEDDING_PROVIDER` defaults to `fake` (deterministic, no network) and
`RAG_DATABASE_URL` is unset, so `ragQuery` uses the PGlite app DB.

> **`EMBEDDING_DIMS` is the single source of truth** for the `vector(N)` column width
> (read by `services/rag/schema.ts`) and the client. Model width, this env, and the
> column must agree: BGE-M3 = 1024, Gemini gemini-embedding-001 = 768, OpenAI 3-small = 1536.
> Changing it after data exists requires re-creating `embedding_chunks` + re-backfilling.

---

## Wiring — DONE

All three integration points are wired in (the Postgres migration has landed, so the
queue/agent/soul files are async and safe to touch):

1. **Index job registered** — `RAG_INDEX_JOB` → `ragIndexHandler` in `services/soul/index.ts` `registerSoulJobs()`.
2. **Enqueue on ingest** — the soul ingest loop enqueues `rag_index` (deduped per source) whenever a source's `content_text` is fetched.
3. **Agent retrieval** — `services/hermes/agent.ts` calls `retrieveContext` + `formatContext` to augment the system prompt before the LLM call. Best-effort: any retrieval error falls back to the base prompt, so a down embedding server never blocks replies.

A one-time backfill for tenants whose knowledge was ingested before RAG existed:
`tsx src/scripts/backfill-rag.ts` (see below).

---

## Operational scripts

**On the VPS** (production image, compiled to `dist`) — run inside the app container:

```bash
cd /srv/whatsapp-flow
docker compose exec app node dist/src/scripts/rag-doctor.js     # preflight: pgvector + embeddings + roundtrip
docker compose exec app node dist/src/scripts/backfill-rag.js   # embed existing soul_sources
```

Local/dev equivalent: `pnpm --filter server exec tsx src/scripts/rag-doctor.ts`.

`rag-doctor` exits non-zero on any failure (CI/health-gate friendly). `backfill-rag`
is idempotent — re-running re-indexes each source cleanly.

## Verification (on VPS)

1. **Unit tests** (no DB, run anywhere): `pnpm --filter server test rag-unit`
2. **DB integration** (real Postgres + pgvector): with `DATABASE_URL` set and the
   extension installed, `rag-db.test.ts` runs (skips automatically if `vector` is missing).
3. **End-to-end smoke** once wired:
   - Connect a tenant's website/FB so `soul_sources` populates → confirm `rag_index` job runs → `SELECT count(*) FROM embedding_chunks WHERE tenant_id = '<t>'` > 0.
   - Send an inbound WhatsApp message whose answer is in the knowledge base → agent reply reflects the retrieved chunk.
   - Cross-tenant check: a query under tenant B must never return tenant A's chunks.

---

## Scale notes (later phases)

- **P5:** swap the HNSW index for **pgvectorscale StreamingDiskANN** and the `embedding`
  column to `halfvec` to take billions of vectors off RAM. Bump `maintenance_work_mem`
  to 8–16GB only during index builds. Move embeddings to self-hosted BGE-M3 on a GPU box
  (set `EMBEDDING_PROVIDER=tei`, `EMBEDDING_URL`, `EMBEDDING_MODEL=BAAI/bge-m3`,
  `EMBEDDING_DIMS=1024`) — code unchanged.
- Embeddings are platform-level (one provider for all tenants); the abstraction lets you
  move provider or to per-tenant keys by config, not code.
