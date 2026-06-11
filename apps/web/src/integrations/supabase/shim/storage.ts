/**
 * supabase-js storage shim over the backend /api/media routes. Files are stored
 * per-tenant on the server; the bucket name is preserved as a path prefix so
 * existing call sites (e.g. 'chat-media') keep working.
 */

const MEDIA_BASE = "/api/media";

interface UploadResult {
  data: { path: string } | null;
  error: Error | null;
}

class StorageBucket {
  constructor(private readonly bucket: string) {}

  async upload(filePath: string, file: Blob | File): Promise<UploadResult> {
    try {
      const res = await fetch(`${MEDIA_BASE}/${filePath}`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": (file as File).type || "application/octet-stream",
        },
        body: file,
      });
      const json = (await res.json().catch(() => null)) as {
        data?: { path: string };
        error?: { message: string };
      } | null;
      if (!res.ok || json?.error) {
        return { data: null, error: new Error(json?.error?.message ?? "Upload failed") };
      }
      return { data: { path: filePath }, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  getPublicUrl(filePath: string): { data: { publicUrl: string } } {
    return { data: { publicUrl: `${MEDIA_BASE}/${filePath}` } };
  }

  async remove(paths: string[]): Promise<{ data: unknown; error: Error | null }> {
    try {
      await Promise.all(
        paths.map((p) =>
          fetch(`${MEDIA_BASE}/${p}`, { method: "DELETE", credentials: "include" }),
        ),
      );
      return { data: {}, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }
}

export const storage = {
  from(bucket: string): StorageBucket {
    return new StorageBucket(bucket);
  },
};
