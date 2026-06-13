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
      for (let i = 0; i < para.length; i += maxChars - overlap) {
        chunks.push(para.slice(i, i + maxChars));
      }
      buf = "";
      continue;
    }
    if (buf.length + para.length + 2 > maxChars) flush();
    buf = buf ? `${buf}\n\n${para}` : para;
  }
  flush();

  return chunks.filter(Boolean);
}
