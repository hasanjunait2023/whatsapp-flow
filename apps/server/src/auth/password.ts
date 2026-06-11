import bcrypt from "bcryptjs";

/**
 * Custom password verifier scaffold for migrated GoTrue (Supabase) users.
 *
 * GoTrue stores bcrypt hashes (prefix `$2a$` / `$2b$` / `$2y$`). better-auth's
 * native hasher (scrypt) cannot verify those, so on first login we:
 *   1. verify the supplied password against the imported bcrypt hash, then
 *   2. signal that the stored hash should be rehashed to better-auth's native
 *      format (handled by the auth layer, which re-stores on success).
 *
 * Phase 1 ships the verifier; the rehash-on-success wiring is finalised when
 * real GoTrue hashes are imported during migration (Phase 4).
 */

const BCRYPT_PREFIXES = ["$2a$", "$2b$", "$2y$"];

export function isBcryptHash(hash: string): boolean {
  return BCRYPT_PREFIXES.some((p) => hash.startsWith(p));
}

export async function verifyBcrypt(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Verify a password against a stored hash that may be either a legacy bcrypt
 * hash (from GoTrue) or already in better-auth's native format.
 *
 * `nativeVerify` is the better-auth native verifier, passed in to avoid a hard
 * dependency cycle. Returns `{ valid, needsRehash }`.
 */
export async function verifyPassword(
  password: string,
  storedHash: string,
  nativeVerify: (data: { password: string; hash: string }) => Promise<boolean>,
): Promise<{ valid: boolean; needsRehash: boolean }> {
  if (isBcryptHash(storedHash)) {
    const valid = await verifyBcrypt(password, storedHash);
    return { valid, needsRehash: valid };
  }
  const valid = await nativeVerify({ password, hash: storedHash });
  return { valid, needsRehash: false };
}
