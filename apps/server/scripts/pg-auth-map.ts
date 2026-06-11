/**
 * Pure mapping from GoTrue (Supabase) auth rows to better-auth rows.
 *
 * GoTrue stores users in `auth.users` and OAuth identities in `auth.identities`.
 * better-auth uses `user` + `account` (one credential account per password user,
 * plus one account row per OAuth provider). This module turns source rows into
 * the exact insert shapes for the better-auth Drizzle tables (auth-schema.ts).
 *
 * Password handling: the bcrypt hash is carried VERBATIM into account.password.
 * src/auth/index.ts already verifies bcrypt on login and lets better-auth
 * rehash to its native format on success (see auth/password.ts). Users whose
 * hash is missing or not a recognised bcrypt hash are flagged for a forced
 * reset (no password stored, so they cannot log in until they reset).
 *
 * No secrets are returned in any log-facing field; the caller must never log
 * the `password` field. Timestamps are emitted as JS Date because the
 * better-auth tables use Drizzle { mode: "timestamp" } (stored as unix epoch).
 */

import { isBcryptHash } from "../src/auth/password.js";

/** A row from GoTrue `auth.users` (only the columns we consume). */
export interface GoTrueUser {
  id: string;
  email: string | null;
  encrypted_password: string | null;
  email_confirmed_at: Date | string | null;
  raw_user_meta_data: Record<string, unknown> | string | null;
  created_at: Date | string | null;
  updated_at: Date | string | null;
}

/** A row from GoTrue `auth.identities` (OAuth links, e.g. provider 'google'). */
export interface GoTrueIdentity {
  id: string;
  user_id: string;
  provider: string;
  /** The provider's stable subject id (GoTrue: identity_data->>'sub' or provider_id). */
  provider_id: string;
  created_at: Date | string | null;
  updated_at: Date | string | null;
}

/** Insert shape for the better-auth `user` table. */
export interface UserRow {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Insert shape for the better-auth `account` table. */
export interface AccountRow {
  id: string;
  accountId: string;
  providerId: string;
  userId: string;
  password: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Full result of mapping one GoTrue user (+ its identities). */
export interface MappedAuth {
  user: UserRow;
  /** Credential account (present unless the user has no usable bcrypt hash). */
  credentialAccount: AccountRow | null;
  /** One account row per OAuth identity, for re-link on next social sign-in. */
  oauthAccounts: AccountRow[];
  /**
   * True when the user has no verifiable password (empty/missing/non-bcrypt
   * hash) AND no OAuth identity — they must reset their password to log in.
   */
  needsPasswordReset: boolean;
}

function toDate(value: Date | string | null | undefined, fallback: Date): Date {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === "string") {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return fallback;
}

/** Pulls a display name from GoTrue user metadata, falling back to the email local-part. */
function deriveName(meta: GoTrueUser["raw_user_meta_data"], email: string | null): string {
  let parsed: Record<string, unknown> | null = null;
  if (typeof meta === "string") {
    try {
      parsed = JSON.parse(meta) as Record<string, unknown>;
    } catch {
      parsed = null;
    }
  } else if (meta && typeof meta === "object") {
    parsed = meta;
  }
  const candidate =
    (parsed?.full_name as string | undefined) ??
    (parsed?.name as string | undefined) ??
    (parsed?.["display_name"] as string | undefined);
  if (candidate && candidate.trim()) return candidate.trim();
  if (email) return email.split("@")[0];
  return "User";
}

function deriveImage(meta: GoTrueUser["raw_user_meta_data"]): string | null {
  let parsed: Record<string, unknown> | null = null;
  if (typeof meta === "string") {
    try {
      parsed = JSON.parse(meta) as Record<string, unknown>;
    } catch {
      parsed = null;
    }
  } else if (meta && typeof meta === "object") {
    parsed = meta;
  }
  const img =
    (parsed?.avatar_url as string | undefined) ?? (parsed?.picture as string | undefined);
  return img && img.trim() ? img.trim() : null;
}

/**
 * Maps a GoTrue user and its OAuth identities into better-auth rows.
 *
 * `genId` produces ids for the new account rows (caller passes crypto.randomUUID
 * so the function stays pure/deterministic under test). The user id is preserved
 * from GoTrue so every downstream tenant/profile/role reference still resolves.
 */
export function mapGoTrueUser(
  source: GoTrueUser,
  identities: readonly GoTrueIdentity[],
  genId: () => string,
): MappedAuth {
  const now = new Date();
  const createdAt = toDate(source.created_at, now);
  const updatedAt = toDate(source.updated_at, createdAt);
  const email = source.email ?? "";

  const user: UserRow = {
    id: source.id,
    name: deriveName(source.raw_user_meta_data, source.email),
    email,
    emailVerified: !!source.email_confirmed_at,
    image: deriveImage(source.raw_user_meta_data),
    createdAt,
    updatedAt,
  };

  const hash = source.encrypted_password?.trim() ?? "";
  const hasUsablePassword = hash.length > 0 && isBcryptHash(hash);

  const credentialAccount: AccountRow | null = hasUsablePassword
    ? {
        id: genId(),
        accountId: source.id,
        providerId: "credential",
        userId: source.id,
        password: hash,
        createdAt,
        updatedAt,
      }
    : null;

  const oauthAccounts: AccountRow[] = identities.map((identity) => ({
    id: genId(),
    accountId: identity.provider_id,
    providerId: identity.provider,
    userId: identity.user_id,
    password: null,
    createdAt: toDate(identity.created_at, createdAt),
    updatedAt: toDate(identity.updated_at, updatedAt),
  }));

  const needsPasswordReset = !hasUsablePassword && oauthAccounts.length === 0;

  return { user, credentialAccount, oauthAccounts, needsPasswordReset };
}
