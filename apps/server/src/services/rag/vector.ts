/** pgvector literal helpers: number[] <-> the textual `[a,b,c]` form pgvector accepts. */

export function toVectorLiteral(vec: number[]): string {
  return `[${vec.join(",")}]`;
}

export function parseVectorLiteral(s: string): number[] {
  const inner = s.trim().replace(/^\[/, "").replace(/\]$/, "");
  if (inner.length === 0) return [];
  return inner.split(",").map(Number);
}
