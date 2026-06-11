/**
 * Storage object downloader for the migration. Isolated behind a single
 * function so the orchestrator can run with it (--download-media + creds) or
 * without it (URL rewrite only). Storage is unreachable while authoring the
 * migration, so the pure planning/rewrite lives in pg-media.ts and is unit
 * tested; this file is the side-effecting download loop, exercised only with
 * live storage access.
 */

import { mkdir, writeFile, stat } from "node:fs/promises";
import path from "node:path";
import { MEDIA_DIR } from "../src/lib/env.js";
import { planMediaUrl } from "./pg-media.js";

/** Downloads one storage URL for a tenant, or no-ops for non-storage values. */
export type MediaDownloader = (url: string, tenantId: string) => Promise<void>;

/** True when the destination already exists (idempotent re-run skips it). */
async function exists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Downloads a Supabase storage object into MEDIA_DIR/{tenant}/{bucket}/{path}.
 * Skips silently when the URL is not a storage URL (already-local or external)
 * or when the file already exists. Network/HTTP errors throw so the caller can
 * decide whether a missing object should abort the run.
 */
export const downloadMedia: MediaDownloader = async (url, tenantId) => {
  const plan = planMediaUrl(url, tenantId);
  if (!plan) return;

  const destination = path.join(MEDIA_DIR, plan.localRelativePath);
  if (await exists(destination)) return;

  const response = await fetch(plan.sourceUrl);
  if (!response.ok) {
    throw new Error(`Storage download failed (${response.status}) for ${plan.objectPath}`);
  }
  const bytes = Buffer.from(await response.arrayBuffer());

  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, bytes);
};
