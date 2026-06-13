import type { EmbeddingClient } from "../types.js";

/**
 * HuggingFace Text Embeddings Inference (TEI) client. TEI serves BGE-M3 on a
 * GPU box and exposes POST /embed { inputs: string[] } -> number[][].
 * See docs/RAG.md for the VPS service definition.
 */
export function teiClient(baseUrl: string, model: string, dims: number): EmbeddingClient {
  const base = baseUrl.replace(/\/$/, "");
  return {
    model,
    dims,
    async embed(texts: string[]): Promise<number[][]> {
      if (texts.length === 0) return [];
      const res = await fetch(`${base}/embed`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ inputs: texts, normalize: true, truncate: true }),
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        throw new Error(`TEI embed failed: ${res.status} ${detail}`);
      }
      const data = (await res.json()) as number[][];
      if (!Array.isArray(data) || (data[0] && data[0].length !== dims)) {
        throw new Error(
          `TEI returned vectors of width ${data[0]?.length ?? "?"}, expected ${dims}`,
        );
      }
      return data;
    },
  };
}
