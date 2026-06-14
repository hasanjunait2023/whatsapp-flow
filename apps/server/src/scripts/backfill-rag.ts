import { fileURLToPath } from "node:url";
import { rawDb } from "../db/index.js";
import { indexSource } from "../services/rag/index.js";

/**
 * One-off backfill: embeds every existing soul_sources row into embedding_chunks.
 * Run once on the VPS after the RAG job is wired (see docs/RAG.md), to populate
 * vectors for tenants whose knowledge was ingested before RAG existed.
 *
 *   pnpm --filter server exec tsx src/scripts/backfill-rag.ts
 *
 * Idempotent: indexSource() deletes a source's old chunks before inserting, so
 * re-running is safe.
 */

interface SourceRow {
  id: string;
  tenant_id: string;
  content_text: string;
}

export async function backfillRag(): Promise<{ sources: number; chunks: number }> {
  const res = await rawDb.query(
    `SELECT id, tenant_id, content_text FROM soul_sources
     WHERE content_text IS NOT NULL AND length(btrim(content_text)) > 0
     ORDER BY tenant_id`,
  );
  const rows = res.rows as unknown as SourceRow[];

  let chunks = 0;
  for (const row of rows) {
    const n = await indexSource({
      tenantId: row.tenant_id,
      sourceType: "soul_source",
      sourceId: row.id,
      text: row.content_text,
    });
    chunks += n;
    console.log(`indexed soul_source ${row.id} (tenant ${row.tenant_id}): ${n} chunks`);
  }
  return { sources: rows.length, chunks };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const out = await backfillRag();
  console.log(`backfill complete: ${out.sources} sources, ${out.chunks} chunks`);
  process.exit(0);
}
