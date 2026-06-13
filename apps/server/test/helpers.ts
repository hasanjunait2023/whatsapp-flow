/**
 * Sets the env the db/auth modules need BEFORE they are imported. Call at the
 * very top of a test file (module side), before `await import("../src/db/...")`.
 *
 * The database itself is an in-process PGlite instance created lazily inside
 * db/index.ts when NODE_ENV === "test" — no path or temp dir is needed. Each
 * test file runs in its own fork (vitest pool:forks, fileParallelism:false),
 * so every file gets a fresh, isolated database.
 */
export function useTempDb(): string {
  process.env.AUTH_SECRET = "test-secret-do-not-use-in-prod";
  process.env.NODE_ENV = "test";
  return ":pglite:";
}
