/**
 * Storage-object URL planning + media_url rewrite for the migration.
 *
 * Supabase serves media from URLs like:
 *   https://<ref>.supabase.co/storage/v1/object/public/<bucket>/<tenant>/<...path>
 *   https://<ref>.supabase.co/storage/v1/object/sign/<bucket>/<tenant>/<...path>?token=...
 *
 * Post-migration the app serves media from the local MEDIA_DIR, namespaced per
 * tenant: /data/media/{tenant_id}/{bucket}/{path}. The DB stores a stable
 * app-relative path (`/media/{tenant_id}/...`) so the value is independent of
 * the absolute MEDIA_DIR on any given host.
 *
 * Storage is not reachable while building this (no creds), so the download loop
 * lives in the orchestrator behind a guard. This module is the pure planning +
 * rewrite layer: given a source URL and a tenant id it returns where the file
 * should land locally and what the rewritten DB value should be. Unit-tested
 * without any network or filesystem access.
 */

/** Stable app-relative prefix the server serves migrated media under. */
export const LOCAL_MEDIA_PREFIX = "/media";

/** A planned media download/rewrite for a single storage URL. */
export interface MediaPlan {
  /** The original Supabase storage URL (download source). */
  sourceUrl: string;
  /** Storage bucket the object lives in (e.g. "media", "avatars"). */
  bucket: string;
  /** Object path within the bucket (the part after the tenant segment is kept whole). */
  objectPath: string;
  /** Path under MEDIA_DIR the file should be written to, relative + posix-style. */
  localRelativePath: string;
  /** The value to store back in the media_url column. */
  rewrittenUrl: string;
}

/** Matches Supabase storage object URLs (public or signed). */
const STORAGE_URL_RE =
  /\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/]+)\/(.+?)(?:\?.*)?$/;

/** True for an absolute http(s) URL pointing at Supabase storage. */
export function isStorageUrl(value: string): boolean {
  return STORAGE_URL_RE.test(value);
}

/** Strips leading/trailing slashes; collapses internal `..` to avoid traversal. */
function sanitiseSegment(segment: string): string {
  return segment
    .split("/")
    .filter((p) => p.length > 0 && p !== "." && p !== "..")
    .join("/");
}

/**
 * Plans the local landing path + rewritten DB value for one storage URL.
 *
 * Returns null when the value is not a recognised storage URL (e.g. it is
 * already a local /media path, an external CDN link, or empty), so the caller
 * leaves such columns untouched. Re-running over an already-rewritten value is
 * a no-op because /media paths are not storage URLs.
 *
 * tenant_id is always the first path segment of the stored object — it is the
 * isolation key and is preserved verbatim in both the local path and the
 * rewritten URL so a tenant's media can never collide with another's.
 */
export function planMediaUrl(value: string, tenantId: string): MediaPlan | null {
  const match = STORAGE_URL_RE.exec(value);
  if (!match) return null;

  const bucket = sanitiseSegment(match[1]);
  const fullObjectPath = sanitiseSegment(decodeURIComponent(match[2]));
  if (!bucket || !fullObjectPath) return null;

  // The stored path normally starts with the tenant id. Keep whatever path the
  // object carries, but always namespace the local copy under the row's tenant
  // so isolation holds even if the source object wasn't tenant-prefixed.
  const objectPath = fullObjectPath;
  const tenantSafe = sanitiseSegment(tenantId);

  const localRelativePath = `${tenantSafe}/${bucket}/${objectPath}`;
  const rewrittenUrl = `${LOCAL_MEDIA_PREFIX}/${tenantSafe}/${bucket}/${objectPath}`;

  return {
    sourceUrl: value,
    bucket,
    objectPath,
    localRelativePath,
    rewrittenUrl,
  };
}

/**
 * Rewrites a media_url column value to its local path, or returns it unchanged
 * when it is not a storage URL (nullish or already-local values pass through).
 * Pure: does not download anything.
 */
export function rewriteMediaUrl(value: string | null, tenantId: string): string | null {
  if (value === null || value === undefined || value === "") return value;
  const plan = planMediaUrl(value, tenantId);
  return plan ? plan.rewrittenUrl : value;
}
