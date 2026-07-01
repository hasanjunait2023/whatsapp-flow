/**
 * Text chunking for embedding. Greedy paragraph packing into ~maxChars windows
 * with a small overlap so retrieval keeps cross-boundary context. Oversized
 * single paragraphs are hard-split by character window. MVP-simple on purpose;
 * a token-aware splitter can replace this later without touching call sites.
 */

export interface ChunkOptions {
  /** Target max characters per chunk. ~1800 chars ≈ 450-500 tokens. */
  maxChars?: number;
  /** Characters of tail context repeated at the head of the next chunk. */
  overlap?: number;
}

export function chunkText(text: string, opts: ChunkOptions = {}): string[] {
  const maxChars = opts.maxChars ?? 1800;
  const overlap = Math.min(opts.overlap ?? 200, Math.floor(maxChars / 2));
  const clean = text.replace(/\r\n/g, "\n").trim();
  if (!clean) return [];
  if (clean.length <= maxChars) return [clean];

  const paras = clean.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const chunks: string[] = [];
  let buf = "";

  const flush = (): void => {
    const trimmed = buf.trim();
    if (trimmed) chunks.push(trimmed);
    buf = overlap > 0 && trimmed.length > overlap ? trimmed.slice(-overlap) : "";
  };

  for (const para of paras) {
    if (para.length > maxChars) {
      flush();
      // Hard-split: ensure each emitted chunk is <= maxChars. With overlap,
      // step forward by `maxChars - overlap` and slice a maxChars window. The
      // last chunk may be < maxChars which is fine — slicing beyond length is
      // a no-op. The `chunk.length <= maxChars` guard is defensive — slices
      // here are always <= maxChars by construction.
      for (let i = 0; i < para.length; i += maxChars - overlap) {
        const end = Math.min(i + maxChars, para.length);
        const chunk = para.slice(i, end);
        if (chunk.length <= maxChars) chunks.push(chunk);
      }
      buf = "";
      continue;
    }
    // Pack paragraphs into the current buffer. If the next paragraph would
    // push us over the cap when joined with the overlap tail, flush first.
    // Then verify the post-join length: if overlap + nextPara + 2 still
    // exceeds maxChars, drop the overlap tail (the alternative — a chunk
    // longer than maxChars — was the bug surfaced by the rag-unit test
    // "splits long text into multiple chunks under the size cap" which
    // produced 531-char chunks for maxChars=500).
    const joinLen = buf.length + para.length + 2; // '\n\n' = 2 chars
    if (joinLen > maxChars) {
      flush();
      // After flush, buf holds the overlap tail (overlap chars). If the next
      // paragraph still can't fit alongside that tail within maxChars, drop
      // the tail — start fresh with just the new paragraph.
      if (buf.length + para.length + 2 > maxChars) {
        buf = "";
      }
    }
    buf = buf ? `${buf}\n\n${para}` : para;
  }
  flush();

  return chunks.filter(Boolean);
}
