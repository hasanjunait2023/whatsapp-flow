import { existsSync, mkdirSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { MEDIA_DIR } from "../lib/env.js";
import type { FnContext, FnResult } from "./waha/session.js";

/**
 * upload-chat-media — stores an uploaded file under MEDIA_DIR/{tenant}/chat/ and
 * returns its authed /media URL. Accepts either:
 *   - multipart/form-data with a `file` field (supabase-js FormData path), or
 *   - JSON { tenant_id, filename, mime_type, file_base64 } fallback.
 *
 * NOTE: the current functions shim JSON.stringifies the request body, so the
 * FormData path does not reach the server intact (see Phase 3 report — a 1-line
 * shim fix is required to forward FormData). The JSON base64 path works today.
 *
 * Returns the original contract: { success, url, filename, mime_type, size }.
 */

const MAX_BYTES = 16 * 1024 * 1024;
const FILENAME_RE = /^[A-Za-z0-9._-]{1,200}$/;

const ok = (data: unknown): FnResult => ({ data, error: null });

function safeName(name: string): string {
  const base = path.basename(name).replace(/[^A-Za-z0-9._-]/g, "_");
  return FILENAME_RE.test(base) ? base : `file_${Date.now()}`;
}

async function store(
  tenantId: string,
  filename: string,
  bytes: Buffer,
  mime: string,
): Promise<FnResult> {
  if (bytes.length > MAX_BYTES) return ok({ success: false, error: "File too large. Maximum size is 16MB" });
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(tenantId)) return ok({ success: false, error: "Invalid tenant" });

  const name = safeName(filename);
  const dir = path.join(path.resolve(MEDIA_DIR), tenantId, "chat");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const unique = `${Date.now()}_${name}`;
  await writeFile(path.join(dir, unique), bytes);
  const url = `/media/${tenantId}/chat/${unique}`;
  return ok({ success: true, url, publicUrl: url, filename: name, mime_type: mime, size: bytes.length });
}

/** JSON fallback handler (registered in HANDLERS). */
export async function uploadChatMediaJson(raw: Record<string, unknown>, ctx: FnContext): Promise<FnResult> {
  const tenantId = (raw.tenant_id as string) ?? ctx.tenantId ?? undefined;
  const fileBase64 = raw.file_base64 as string | undefined;
  const filename = (raw.filename as string) ?? "file";
  const mime = (raw.mime_type as string) ?? "application/octet-stream";
  if (!tenantId) return ok({ success: false, error: "No tenant_id provided" });
  if (!ctx.isAdmin && tenantId !== ctx.tenantId) return ok({ success: false, error: "Forbidden tenant" });
  if (!fileBase64) return ok({ success: false, error: "No file provided" });

  let bytes: Buffer;
  try {
    bytes = Buffer.from(fileBase64.replace(/^data:[^;]+;base64,/, ""), "base64");
  } catch {
    return ok({ success: false, error: "Invalid base64 file" });
  }
  return store(tenantId, filename, bytes, mime);
}

/**
 * Multipart handler — invoked directly by the fn route when the request is
 * multipart/form-data. Reads the `file` blob + `tenant_id` field.
 */
export async function uploadChatMediaMultipart(form: FormData, ctx: FnContext): Promise<FnResult> {
  const tenantId = (form.get("tenant_id") as string | null) ?? ctx.tenantId ?? undefined;
  const file = form.get("file");
  if (!tenantId) return ok({ success: false, error: "No tenant_id provided" });
  if (!ctx.isAdmin && tenantId !== ctx.tenantId) return ok({ success: false, error: "Forbidden tenant" });
  if (!(file instanceof File)) return ok({ success: false, error: "No file provided" });
  const bytes = Buffer.from(await file.arrayBuffer());
  return store(tenantId, file.name || "file", bytes, file.type || "application/octet-stream");
}
