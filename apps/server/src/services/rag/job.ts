import { indexSource } from "./index.js";

/**
 * Background-job handler for re-indexing a knowledge source. Registered in
 * services/soul/index.ts registerSoulJobs() and enqueued from the soul ingest
 * loop when a source's content_text is fetched.
 */

export const RAG_INDEX_JOB = "rag_index";

export interface RagIndexPayload {
  tenantId: string;
  sourceType: string;
  sourceId: string;
  text: string;
}

export async function ragIndexHandler(payload: unknown): Promise<void> {
  const p = payload as RagIndexPayload;
  await indexSource({
    tenantId: p.tenantId,
    sourceType: p.sourceType,
    sourceId: p.sourceId,
    text: p.text,
  });
}
