import { describe, it, expect } from "vitest";
import { chunkText } from "../src/services/rag/chunk.js";
import { toVectorLiteral, parseVectorLiteral } from "../src/services/rag/vector.js";
import { formatContext } from "../src/services/rag/index.js";
import { fakeClient } from "../src/embeddings/registry.js";

describe("chunkText", () => {
  it("returns empty array for blank text", () => {
    expect(chunkText("")).toEqual([]);
    expect(chunkText("   \n  ")).toEqual([]);
  });

  it("returns a single chunk when text fits", () => {
    const out = chunkText("short business description");
    expect(out).toEqual(["short business description"]);
  });

  it("splits long text into multiple chunks under the size cap", () => {
    const para = "lorem ipsum ".repeat(40).trim(); // ~480 chars
    const text = Array.from({ length: 6 }, () => para).join("\n\n");
    const chunks = chunkText(text, { maxChars: 500, overlap: 50 });
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(500);
  });

  it("hard-splits an oversized single paragraph", () => {
    const huge = "x".repeat(5000);
    const chunks = chunkText(huge, { maxChars: 1000, overlap: 100 });
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(1000);
  });
});

describe("vector literal", () => {
  it("round-trips through pgvector text form", () => {
    const vec = [0.1, -0.25, 0.5];
    expect(toVectorLiteral(vec)).toBe("[0.1,-0.25,0.5]");
    expect(parseVectorLiteral("[0.1,-0.25,0.5]")).toEqual(vec);
  });

  it("parses an empty vector literal", () => {
    expect(parseVectorLiteral("[]")).toEqual([]);
  });
});

describe("fakeClient", () => {
  it("is deterministic and L2-normalised at the configured width", async () => {
    const client = fakeClient("fake", 8);
    const [a] = await client.embed(["hello"]);
    const [b] = await client.embed(["hello"]);
    expect(a).toEqual(b);
    expect(a.length).toBe(8);
    const norm = Math.sqrt(a.reduce((s, v) => s + v * v, 0));
    expect(norm).toBeCloseTo(1, 5);
  });

  it("gives different vectors for different text", async () => {
    const client = fakeClient("fake", 16);
    const [a] = await client.embed(["alpha"]);
    const [b] = await client.embed(["beta"]);
    expect(a).not.toEqual(b);
  });

  it("returns one vector per input and [] for empty batch", async () => {
    const client = fakeClient("fake", 4);
    expect(await client.embed([])).toEqual([]);
    expect((await client.embed(["a", "b", "c"])).length).toBe(3);
  });
});

describe("formatContext", () => {
  it("returns empty string for no chunks", () => {
    expect(formatContext([])).toBe("");
  });

  it("numbers and joins chunks", () => {
    const out = formatContext(["first", "second"]);
    expect(out).toContain("[1] first");
    expect(out).toContain("[2] second");
    expect(out).toContain("Relevant business knowledge");
  });
});
