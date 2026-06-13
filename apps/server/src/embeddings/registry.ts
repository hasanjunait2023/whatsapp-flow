import { teiClient } from "./providers/tei.js";
import { ollamaClient } from "./providers/ollama.js";
import { EMBEDDING_DIMS, type EmbeddingClient } from "./types.js";

/**
 * Resolves the active embedding client from environment. Reads process.env
 * directly (not lib/env.ts) to stay decoupled from the in-flight Postgres
 * migration that owns that file.
 *
 *   EMBEDDING_PROVIDER  tei | ollama | fake   (default: tei in prod, fake in test)
 *   EMBEDDING_URL       base URL of the embedding server
 *   EMBEDDING_MODEL     model id (default BAAI/bge-m3)
 *   EMBEDDING_DIMS      vector width (default 1024; must match the DB column)
 */

const MODEL = process.env.EMBEDDING_MODEL ?? "BAAI/bge-m3";
const DIMS = Number(process.env.EMBEDDING_DIMS ?? EMBEDDING_DIMS);

function providerName(): string {
  const explicit = process.env.EMBEDDING_PROVIDER?.toLowerCase();
  if (explicit) return explicit;
  return process.env.NODE_ENV === "test" ? "fake" : "tei";
}

/**
 * Deterministic, network-free embedding for tests/CI. Same text -> same vector,
 * L2-normalised so cosine distance is well behaved. Not semantically meaningful;
 * exact-match retrieval in tests relies only on determinism.
 */
export function fakeClient(model = "fake", dims = DIMS): EmbeddingClient {
  return {
    model,
    dims,
    async embed(texts: string[]): Promise<number[][]> {
      return texts.map((text) => {
        const vec = new Array<number>(dims);
        let norm = 0;
        for (let i = 0; i < dims; i++) {
          // cheap deterministic hash of (text, i) -> [-1, 1)
          let h = 2166136261 ^ i;
          for (let c = 0; c < text.length; c++) {
            h = Math.imul(h ^ text.charCodeAt(c), 16777619);
          }
          const v = ((h >>> 0) / 0xffffffff) * 2 - 1;
          vec[i] = v;
          norm += v * v;
        }
        norm = Math.sqrt(norm) || 1;
        for (let i = 0; i < dims; i++) vec[i] /= norm;
        return vec;
      });
    },
  };
}

let cached: EmbeddingClient | null = null;

export function resolveEmbeddingClient(): EmbeddingClient {
  if (cached) return cached;
  const name = providerName();
  switch (name) {
    case "tei":
      cached = teiClient(process.env.EMBEDDING_URL ?? "http://127.0.0.1:8080", MODEL, DIMS);
      break;
    case "ollama":
      cached = ollamaClient(process.env.EMBEDDING_URL ?? "http://127.0.0.1:11434", MODEL, DIMS);
      break;
    case "fake":
      cached = fakeClient(MODEL, DIMS);
      break;
    default:
      throw new Error(`Unknown EMBEDDING_PROVIDER: ${name}`);
  }
  return cached;
}

/** Test hook: inject a client or clear the cache. */
export function setEmbeddingClient(client: EmbeddingClient | null): void {
  cached = client;
}
