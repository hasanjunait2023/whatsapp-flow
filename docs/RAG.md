# RAG Layer (P1) — Self-Hosted Embeddings + pgvector

Phase 1 of the [Scaling Roadmap](SCALING_ROADMAP.md). Gives the AI agents
retrieval over each tenant's own business knowledge, using **self-hosted BGE-M3**
embeddings (strong Bengali) and **pgvector** in the existing Postgres — no separate
vector database.

Everything runs on the **VPS**. Nothing here needs local installation.

---

## What shipped (code)

All additive, conflict-free with the in-flight SQLite→Postgres migration. New files only:

| File | Purpose |
|------|---------|
| `apps/server/src/embeddings/types.ts` | `EmbeddingClient` interface, `EMBEDDING_DIMS = 1024` |
| `apps/server/src/embeddings/providers/tei.ts` | TEI HTTP client (`POST /embed`) |
| `apps/server/src/embeddings/providers/ollama.ts` | Ollama client (`POST /api/embed`) |
| `apps/server/src/embeddings/registry.ts` | `resolveEmbeddingClient()` from env + deterministic `fakeClient` for tests |
| `apps/server/src/services/rag/schema.ts` | `ensureRagSchema()` — idempotent DDL (extension + table + indexes) |
| `apps/server/src/services/rag/chunk.ts` | `chunkText()` — paragraph-packed windows + overlap |
| `apps/server/src/services/rag/vector.ts` | pgvector literal `[]` serialise/parse |
| `apps/server/src/services/rag/index.ts` | `indexSource()`, `retrieveContext()`, `formatContext()` |
| `apps/server/src/services/rag/job.ts` | `RAG_INDEX_JOB` + `ragIndexHandler` (not registered yet) |
| `apps/server/test/rag-unit.test.ts` | pure-logic tests (no DB) |
| `apps/server/test/rag-db.test.ts` | DB integration, self-skips without pgvector |

**Design note:** `ensureRagSchema()` runs the DDL lazily and idempotently instead of a
drizzle migration, on purpose — the drizzle journal is owned by the concurrent Postgres
migration. Fold it into a generated migration once that settles.

`embedding_chunks` schema:

```
id uuid PK | tenant_id text | source_type text | source_id text
chunk_index int | chunk_text text | embedding vector(1024) | created_at timestamptz
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

## VPS setup

### 1. Install pgvector in Postgres

The app talks to a shared Postgres. The server needs the `vector` extension available
so `CREATE EXTENSION` (run automatically by `ensureRagSchema`) succeeds.

- **Debian/Ubuntu package:** `sudo apt-get install postgresql-16-pgvector` (match your PG major), then restart Postgres.
- **Docker Postgres:** switch the image to `pgvector/pgvector:pg16` (drop-in superset of `postgres:16`).

The app role needs `CREATE` on the database to create the extension the first time, or a
superuser runs `CREATE EXTENSION vector;` once.

### 2. Run an embedding server

**Option A — TEI (GPU, production, fastest):**

```yaml
# add to docker-compose.yml (VPS). GPU host required.
  embeddings:
    image: ghcr.io/huggingface/text-embeddings-inference:1.5
    command: ["--model-id", "BAAI/bge-m3"]
    ports: ["8080:80"]
    deploy:
      resources:
        reservations:
          devices: [{ driver: nvidia, count: 1, capabilities: [gpu] }]
    restart: unless-stopped
```

**Option B — Ollama (CPU, fine for P1 small corpora, no GPU):**

```bash
# on the VPS
ollama pull bge-m3
# serves on :11434
```

### 3. Server environment

```bash
# tei (Option A)
EMBEDDING_PROVIDER=tei
EMBEDDING_URL=http://embeddings:80        # compose service; or http://127.0.0.1:8080
EMBEDDING_MODEL=BAAI/bge-m3
EMBEDDING_DIMS=1024

# ollama (Option B)
EMBEDDING_PROVIDER=ollama
EMBEDDING_URL=http://127.0.0.1:11434
EMBEDDING_MODEL=bge-m3
EMBEDDING_DIMS=1024
```

In tests `EMBEDDING_PROVIDER` defaults to `fake` (deterministic, no network).

> **If you change `EMBEDDING_DIMS`,** also change the `vector(1024)` column width in
> `services/rag/schema.ts`. The model output width and the column must match.

---

## Post-migration wiring

These three steps touch `queue.ts` / `agent.ts` / the soul service — files the Postgres
migration currently owns (they still import the removed synchronous `sqlite`). Do them
**after** the migration lands so there's no conflict or broken import.

**1. Register the index job** (where `registerSoulJobs()` / `registerHermesPipeline()` are wired at boot):

```ts
import { registerJobHandler } from "../../jobs/queue.js";
import { RAG_INDEX_JOB, ragIndexHandler } from "../rag/job.js";
registerJobHandler(RAG_INDEX_JOB, ragIndexHandler);
```

**2. Enqueue indexing when a knowledge source changes** (in the soul service, after a
`soul_sources` row is inserted/updated):

```ts
import { enqueueJob } from "../../jobs/queue.js";
import { RAG_INDEX_JOB } from "../rag/job.js";
enqueueJob({
  kind: RAG_INDEX_JOB,
  tenantId,
  payload: { tenantId, sourceType: "soul_source", sourceId, text },
  dedupeKey: `rag:soul_source:${sourceId}`,
});
```

**3. Inject retrieved context into the agent** (`services/hermes/agent.ts`, just before
building `messages` from `systemPrompt`):

```ts
import { retrieveContext, formatContext } from "../rag/index.js";
const latestUser = history.filter((m) => m.role === "user").at(-1)?.content ?? "";
const ctx = latestUser ? await retrieveContext({ tenantId, query: latestUser }) : [];
const augmentedPrompt = systemPrompt + formatContext(ctx);
// use augmentedPrompt in: { role: "system", content: augmentedPrompt }
```

A one-time backfill for existing tenants: iterate `soul_sources` and call `indexSource`
for each (or enqueue `RAG_INDEX_JOB`).

---

## Operational scripts

Invoked with `tsx` (no `package.json` edit needed — that file is migration-owned):

```bash
# Preflight: pgvector + embedding server + roundtrip. Run during VPS bring-up.
pnpm --filter server exec tsx src/scripts/rag-doctor.ts

# One-off backfill: embed all existing soul_sources rows. Run after wiring.
pnpm --filter server exec tsx src/scripts/backfill-rag.ts
```

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
  column to `halfvec(1024)` to take billions of vectors off RAM. Bump
  `maintenance_work_mem` to 8–16GB only during index builds.
- Embeddings are platform-level (one TEI for all tenants); the provider abstraction lets
  you move to per-tenant or an API provider by config, not code.
