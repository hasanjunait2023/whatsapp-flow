import { describe, it, expect, beforeAll } from "vitest";
import { useTempDb } from "./helpers.js";

useTempDb();

const { ensureRagSchema, resetRagSchemaCache } = await import("../src/services/rag/schema.js");
const { indexSource, retrieveContext } = await import("../src/services/rag/index.js");

// pgvector is not bundled with local PGlite, so this suite self-skips locally
// and runs on real Postgres + pgvector (VPS / CI). Probe once at load time.
let vectorAvailable = true;
try {
  await ensureRagSchema();
} catch {
  vectorAvailable = false;
  resetRagSchemaCache();
}

const TENANT_A = "aaaa1111-1111-1111-1111-111111111111";
const TENANT_B = "bbbb2222-2222-2222-2222-222222222222";

describe.skipIf(!vectorAvailable)("rag indexSource + retrieveContext", () => {
  beforeAll(async () => {
    await ensureRagSchema();
  });

  it("indexes a source and retrieves it by exact-match query", async () => {
    const text = "Acme Sweets sells mishti and cakes in Dhaka, open 9am to 9pm.";
    const count = await indexSource({
      tenantId: TENANT_A,
      sourceType: "soul_source",
      sourceId: "src-1",
      text,
    });
    expect(count).toBe(1);

    const hits = await retrieveContext({ tenantId: TENANT_A, query: text, k: 5 });
    expect(hits[0]).toBe(text);
  });

  it("isolates retrieval by tenant_id", async () => {
    const text = "Tenant A private knowledge base entry.";
    await indexSource({ tenantId: TENANT_A, sourceType: "faq", sourceId: "f-1", text });

    const otherTenant = await retrieveContext({ tenantId: TENANT_B, query: text, k: 5 });
    expect(otherTenant).not.toContain(text);
  });

  it("re-indexing a source replaces its old chunks", async () => {
    const id = "src-reindex";
    await indexSource({ tenantId: TENANT_A, sourceType: "soul_source", sourceId: id, text: "first version" });
    await indexSource({ tenantId: TENANT_A, sourceType: "soul_source", sourceId: id, text: "second version" });

    const hits = await retrieveContext({ tenantId: TENANT_A, query: "second version", k: 5 });
    expect(hits).toContain("second version");
    expect(hits).not.toContain("first version");
  });
});
