import { ensureRagSchema } from "../services/rag/schema.js";
import { ragQuery, hasDedicatedRagDb } from "../services/rag/db.js";
import { resolveEmbeddingClient } from "../embeddings/registry.js";
import { indexSource, retrieveContext } from "../services/rag/index.js";

/**
 * RAG preflight for VPS bring-up. Verifies, in order:
 *   1. pgvector available + embedding_chunks schema creatable
 *   2. the configured embedding server is reachable and returns the right width
 *   3. an index -> retrieve roundtrip works end to end
 * Cleans up its probe rows. Exit 0 = all pass, 1 = any failure.
 *
 *   pnpm --filter server exec tsx src/scripts/rag-doctor.ts
 */

const DOCTOR_SOURCE_TYPE = "_doctor";
const DOCTOR_TENANT = "00000000-0000-0000-0000-0000000000ff";

async function check(name: string, fn: () => Promise<void>): Promise<boolean> {
  try {
    await fn();
    console.log(`PASS  ${name}`);
    return true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`FAIL  ${name}: ${msg}`);
    return false;
  }
}

export async function ragDoctor(): Promise<boolean> {
  let ok = true;

  console.log(`RAG DB: ${hasDedicatedRagDb() ? "dedicated (RAG_DATABASE_URL)" : "app DB fallback"}`);

  ok = (await check("pgvector extension + embedding_chunks schema", async () => {
    await ensureRagSchema();
  })) && ok;

  const client = resolveEmbeddingClient();
  ok = (await check(`embedding server reachable (${client.model}, dims=${client.dims})`, async () => {
    const [vec] = await client.embed(["preflight probe"]);
    if (!vec || vec.length !== client.dims) {
      throw new Error(`expected width ${client.dims}, got ${vec?.length}`);
    }
  })) && ok;

  ok = (await check("index -> retrieve roundtrip", async () => {
    const text = "rag doctor roundtrip probe text";
    await indexSource({ tenantId: DOCTOR_TENANT, sourceType: DOCTOR_SOURCE_TYPE, sourceId: "probe", text });
    const hits = await retrieveContext({ tenantId: DOCTOR_TENANT, query: text, k: 1 });
    if (hits[0] !== text) throw new Error("retrieved chunk did not match indexed text");
  })) && ok;

  await ragQuery(`DELETE FROM embedding_chunks WHERE source_type = $1`, [DOCTOR_SOURCE_TYPE]).catch(
    () => {},
  );

  return ok;
}

if (process.argv[1] && process.argv[1].endsWith("rag-doctor.ts")) {
  const ok = await ragDoctor();
  console.log(ok ? "RAG doctor: ALL PASS" : "RAG doctor: FAILURES — see above");
  process.exit(ok ? 0 : 1);
}
