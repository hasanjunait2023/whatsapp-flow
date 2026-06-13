/**
 * Embedding-provider abstraction. Mirrors the shape of llm/registry so the
 * backing model is swappable (self-hosted TEI/Ollama in prod, a deterministic
 * fake in tests) without touching call sites. Vectors are plain number[] of
 * length `dims`; the RAG layer serialises them to a pgvector literal.
 */

/** BGE-M3 output width. The embedding_chunks.embedding column is vector(EMBEDDING_DIMS). */
export const EMBEDDING_DIMS = 1024;

export interface EmbeddingClient {
  /** Model identifier, for logging/observability. */
  readonly model: string;
  /** Vector width; must equal the embedding_chunks column dimension. */
  readonly dims: number;
  /** Embed a batch of texts; returns one vector (length === dims) per input. */
  embed(texts: string[]): Promise<number[][]>;
}
