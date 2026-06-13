import { ragQuery } from "./db.js";
import { EMBEDDING_DIMS } from "../../embeddings/types.js";

/**
 * Idempotent DDL for the RAG layer. Deliberately NOT a drizzle migration: the
 * SQLite->Postgres migration in a separate session owns the drizzle journal,
 * so RAG bootstraps its own schema lazily to stay conflict-free. Once the
 * migration settles this can be folded into a generated migration.
 *
 * Requires the `vector` extension to be available in the Postgres server
 * (pgvector). On the VPS install it once: see docs/RAG.md. Local PGlite tests
 * that lack the extension self-skip the DB integration suite.
 */

let ensured: Promise<void> | null = null;

export function ensureRagSchema(): Promise<void> {
  if (!ensured) ensured = doEnsure();
  return ensured;
}

async function doEnsure(): Promise<void> {
  await ragQuery(`CREATE EXTENSION IF NOT EXISTS vector`);
  await ragQuery(`
    CREATE TABLE IF NOT EXISTS embedding_chunks (
      id           uuid PRIMARY KEY,
      tenant_id    text NOT NULL,
      source_type  text NOT NULL,
      source_id    text NOT NULL,
      chunk_index  integer NOT NULL,
      chunk_text   text NOT NULL,
      embedding    vector(${EMBEDDING_DIMS}) NOT NULL,
      created_at   timestamptz NOT NULL DEFAULT now()
    )
  `);
  await ragQuery(
    `CREATE INDEX IF NOT EXISTS embedding_chunks_tenant_idx ON embedding_chunks (tenant_id)`,
  );
  await ragQuery(
    `CREATE UNIQUE INDEX IF NOT EXISTS embedding_chunks_source_uidx
       ON embedding_chunks (tenant_id, source_type, source_id, chunk_index)`,
  );
  // ANN index for cosine search. Best-effort: older pgvector lacks HNSW; the
  // tenant-filtered query still works via exact scan until this exists.
  try {
    await ragQuery(
      `CREATE INDEX IF NOT EXISTS embedding_chunks_hnsw
         ON embedding_chunks USING hnsw (embedding vector_cosine_ops)`,
    );
  } catch {
    // HNSW unavailable on this pgvector build — acceptable at P1 scale.
  }
}

/** Test hook: forget the memoised promise so a fresh DB re-runs the DDL. */
export function resetRagSchemaCache(): void {
  ensured = null;
}
