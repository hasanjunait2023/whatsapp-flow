import path from "node:path";

/**
 * Centralised environment access. Required secrets are validated lazily so that
 * tooling (drizzle-kit, tests) can import the schema without a full runtime env.
 */

export const DB_PATH = process.env.DB_PATH ?? path.resolve(process.cwd(), "data", "app.db");

export const MEDIA_DIR =
  process.env.MEDIA_DIR ?? path.resolve(process.cwd(), "data", "media");

export const PORT = Number(process.env.PORT ?? 3000);

export const NODE_ENV = process.env.NODE_ENV ?? "development";

export const IS_PRODUCTION = NODE_ENV === "production";

/** Absolute path to the built SPA (apps/web/dist), served in production. */
export const WEB_DIST_DIR =
  process.env.WEB_DIST_DIR ?? path.resolve(process.cwd(), "..", "web", "dist");

/** Secret used by better-auth for signing. Required at runtime, not at import. */
export function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is not configured");
  }
  return secret;
}

/** Base URL the auth server is reachable at (same-origin in production). */
export const AUTH_BASE_URL = process.env.AUTH_BASE_URL ?? `http://localhost:${PORT}`;
