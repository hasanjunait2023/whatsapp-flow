import { randomUUID } from "node:crypto";
import { ragQuery } from "./db.js";
import { resolveEmbeddingClient } from "../../embeddings/registry.js";
import type { EmbeddingClient } from "../../embeddings/types.js";
import { ensureRagSchema } from "./schema.js";
import { chunkText } from "./chunk.js";
import { toVectorLiteral } from "./vector.js";

/**
 * RAG service: index a tenant's knowledge source (chunk -> embed -> upsert) and
 * retrieve the top-k chunks most similar to a query, always filtered by
 * tenant_id. Vector search and tenant isolation are one SQL statement — the
 * reason pgvector beats a separate vector store here (no cross-store sync).
 *
 * All DB access goes through ragQuery (the dedicated pgvector DB when
 * RAG_DATABASE_URL is set, else the app DB) — async, works on prod pg + PGlite.
 */

export interface IndexSourceInput {
  tenantId: string;
  /** e.g. "soul_source" | "faq" | "product" */
  sourceType: string;
  sourceId: string;
  text: string;
  /** Injectable for tests; defaults to the env-resolved client. */
  client?: EmbeddingClient;
}

/** Re-indexes one source: deletes its old chunks, then inserts fresh ones. */
export async function indexSource(input: IndexSourceInput): Promise<number> {
  await ensureRagSchema();

  await ragQuery(
    `DELETE FROM embedding_chunks WHERE tenant_id = $1 AND source_type = $2 AND source_id = $3`,
    [input.tenantId, input.sourceType, input.sourceId],
  );

  const chunks = chunkText(input.text);
  if (chunks.length === 0) return 0;

  const client = input.client ?? resolveEmbeddingClient();
  const vectors = await client.embed(chunks);

  for (let i = 0; i < chunks.length; i++) {
    await ragQuery(
      `INSERT INTO embedding_chunks
         (id, tenant_id, source_type, source_id, chunk_index, chunk_text, embedding)
       VALUES ($1, $2, $3, $4, $5, $6, $7::vector)`,
      [
        randomUUID(),
        input.tenantId,
        input.sourceType,
        input.sourceId,
        i,
        chunks[i],
        toVectorLiteral(vectors[i]),
      ],
    );
  }
  return chunks.length;
}

export interface RetrieveInput {
  tenantId: string;
  query: string;
  /** Number of chunks to return (default 5). */
  k?: number;
  client?: EmbeddingClient;
}

/** Returns the top-k chunk texts for a tenant, ordered by cosine similarity. */
export async function retrieveContext(input: RetrieveInput): Promise<string[]> {
  await ensureRagSchema();
  const client = input.client ?? resolveEmbeddingClient();
  const [queryVec] = await client.embed([input.query]);
  if (!queryVec) return [];

  const res = await ragQuery(
    `SELECT chunk_text FROM embedding_chunks
     WHERE tenant_id = $1
     ORDER BY embedding <=> $2::vector
     LIMIT $3`,
    [input.tenantId, toVectorLiteral(queryVec), input.k ?? 5],
  );
  return res.rows.map((r) => String((r as { chunk_text: string }).chunk_text));
}

/** Formats retrieved chunks for injection into an agent system prompt. */
export function formatContext(chunks: string[]): string {
  if (chunks.length === 0) return "";
  const body = chunks.map((c, i) => `[${i + 1}] ${c}`).join("\n\n");
  return `\n\n# Relevant business knowledge\nUse the following retrieved context to answer when relevant.\n\n${body}\n`;
}
