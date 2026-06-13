import type { EmbeddingClient } from "../types.js";

/**
 * Google Gemini embeddings (default text-embedding-004, 768-dim, multilingual
 * with strong Bengali). Uses batchEmbedContents and reuses the platform
 * GEMINI_API_KEY. Zero VPS RAM — the P1 choice while self-hosted BGE-M3 waits
 * for a dedicated GPU box (swap is env-only, the abstraction is unchanged).
 */
const BASE = "https://generativelanguage.googleapis.com/v1beta";

export function geminiClient(apiKey: string, model: string, dims: number): EmbeddingClient {
  const modelPath = model.startsWith("models/") ? model : `models/${model}`;
  return {
    model,
    dims,
    async embed(texts: string[]): Promise<number[][]> {
      if (texts.length === 0) return [];
      // Key goes in a header, not the query string, so it can't leak via
      // request logs / proxy access logs / error URLs.
      const res = await fetch(`${BASE}/${modelPath}:batchEmbedContents`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          requests: texts.map((t) => ({
            model: modelPath,
            content: { parts: [{ text: t }] },
          })),
        }),
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        throw new Error(`Gemini embed failed: ${res.status} ${detail}`);
      }
      const data = (await res.json()) as { embeddings?: Array<{ values: number[] }> };
      const vectors = (data.embeddings ?? []).map((e) => e.values);
      if (vectors[0] && vectors[0].length !== dims) {
        throw new Error(`Gemini returned width ${vectors[0].length}, expected ${dims}`);
      }
      return vectors;
    },
  };
}
