import { teiClient } from "./providers/tei.js";
import { ollamaClient } from "./providers/ollama.js";
import { geminiClient } from "./providers/gemini.js";
import { EMBEDDING_DIMS, type EmbeddingClient } from "./types.js";

/**
 * Resolves the active embedding client from environment. Reads process.env
 * directly (not lib/env.ts) to stay decoupled from the Postgres migration that
 * owns that file.
 *
 *   EMBEDDING_PROVIDER  gemini | tei | ollama | fake  (default: gemini in prod, fake in test)
 *   EMBEDDING_URL       base URL of a self-hosted server (tei/ollama)
 *   EMBEDDING_MODEL     model id (per-provider default below)
 *   EMBEDDING_DIMS      vector width — MUST match the model and the DB column
 *   EMBEDDING_API_KEY   key for API providers (falls back to GEMINI_API_KEY for gemini)
 */

const DIMS = Number(process.env.EMBEDDING_DIMS ?? EMBEDDING_DIMS);

function providerName(): string {
  const explicit = process.env.EMBEDDING_PROVIDER?.toLowerCase();
  if (explicit) return explicit;
  return process.env.NODE_ENV === "test" ? "fake" : "gemini";
}

function modelFor(provider: string): string {
  if (process.env.EMBEDDING_MODEL) return process.env.EMBEDDING_MODEL;
  switch (provider) {
    case "gemini":
      return "gemini-embedding-001";
    case "tei":
    case "ollama":
      return "BAAI/bge-m3";
    default:
      return "fake";
  }
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
  const model = modelFor(name);
  switch (name) {
    case "gemini": {
      const key = process.env.EMBEDDING_API_KEY ?? process.env.GEMINI_API_KEY;
      if (!key) {
        throw new Error("EMBEDDING_PROVIDER=gemini but no GEMINI_API_KEY / EMBEDDING_API_KEY set");
      }
      cached = geminiClient(key, model, DIMS);
      break;
    }
    case "tei":
      cached = teiClient(process.env.EMBEDDING_URL ?? "http://127.0.0.1:8080", model, DIMS);
      break;
    case "ollama":
      cached = ollamaClient(process.env.EMBEDDING_URL ?? "http://127.0.0.1:11434", model, DIMS);
      break;
    case "fake":
      cached = fakeClient(model, DIMS);
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
