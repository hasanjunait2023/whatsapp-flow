import type { EmbeddingClient } from "../types.js";

/**
 * Ollama embedding client (dev/CPU fallback for small corpora). Uses the batch
 * endpoint POST /api/embed { model, input: string[] } -> { embeddings: number[][] }.
 * Pull the model on the VPS first: `ollama pull bge-m3`.
 */
export function ollamaClient(baseUrl: string, model: string, dims: number): EmbeddingClient {
  const base = baseUrl.replace(/\/$/, "");
  return {
    model,
    dims,
    async embed(texts: string[]): Promise<number[][]> {
      if (texts.length === 0) return [];
      const res = await fetch(`${base}/api/embed`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ model, input: texts }),
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        throw new Error(`Ollama embed failed: ${res.status} ${detail}`);
      }
      const data = (await res.json()) as { embeddings?: number[][] };
      const vectors = data.embeddings ?? [];
      if (vectors[0] && vectors[0].length !== dims) {
        throw new Error(
          `Ollama returned vectors of width ${vectors[0].length}, expected ${dims}`,
        );
      }
      return vectors;
    },
  };
}
