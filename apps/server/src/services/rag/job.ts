import { indexSource } from "./index.js";

/**
 * Background-job handler for re-indexing a knowledge source. NOT registered yet:
 * registration imports jobs/queue.ts, which is mid-migration (still references
 * the removed synchronous `sqlite` export). Wire this in once the migration
 * lands — see docs/RAG.md "Post-migration wiring".
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
