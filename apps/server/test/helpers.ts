import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

/**
 * Points DB_PATH and AUTH_SECRET at a throwaway location BEFORE the db/auth
 * modules are imported. Call at the very top of a test file (module side).
 */
export function useTempDb(): string {
  const dir = mkdtempSync(path.join(tmpdir(), "wf-test-"));
  const dbPath = path.join(dir, "test.db");
  process.env.DB_PATH = dbPath;
  process.env.AUTH_SECRET = "test-secret-do-not-use-in-prod";
  process.env.NODE_ENV = "test";
  return dbPath;
}
