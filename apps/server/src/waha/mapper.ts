import { mkdirSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { MEDIA_DIR, WAHA_API_KEY } from "../lib/env.js";

/**
 * Maps a WAHA NOWEB `message` / `message.any` webhook payload to an internal
 * message row. Replaces the Wasender `transformWasenderMessage`. WAHA delivers
 * media as a ready-to-download URL (no decrypt step), so media is fetched from
 * payload.media.url and stored on local disk.
 */

export interface WahaMessagePayload {
  id?: string;
  timestamp?: number;
  from?: string;
  to?: string;
  fromMe?: boolean;
  body?: string;
  hasMedia?: boolean;
  media?: { url?: string; mimetype?: string; filename?: string | null; error?: string | null } | null;
  // NOWEB nested raw data — location lives here.
  _data?: {
    Message?: {
      locationMessage?: { degreesLatitude?: number; degreesLongitude?: number; name?: string; address?: string };
    };
    message?: {
      locationMessage?: { degreesLatitude?: number; degreesLongitude?: number; name?: string; address?: string };
    };
  };
  // Some NOWEB versions surface a top-level location object.
  location?: { latitude?: number; longitude?: number; name?: string; address?: string };
}

export interface MappedMessage {
  waMessageId: string | null;
  direction: "inbound" | "outbound";
  /** Bare WhatsApp id (suffix stripped), used as wa_id. */
  waId: string;
  /** Phone number (digits, suffix stripped). May equal a LID number when @lid. */
  phone: string;
  isLid: boolean;
  chatId: string;
  isGroup: boolean;
  contentType: string;
  content: string;
  mediaUrl: string | null;
  mediaMimeType: string | null;
  mediaFilename: string | null;
  locationLat: string | null;
  locationLng: string | null;
  /** ISO-8601 timestamp derived from payload.timestamp (seconds → ms). */
  sentAt: string;
}

const MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "video/mp4": "mp4",
  "video/3gpp": "3gp",
  "audio/ogg": "ogg",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};

function extFor(mime: string): string {
  const clean = mime.split(";")[0].trim();
  return MIME_EXT[clean] ?? clean.split("/")[1] ?? "bin";
}

/** Strips the chat suffix from a WhatsApp id, returning bare digits/id. */
export function stripSuffix(id: string): string {
  return id.replace("@s.whatsapp.net", "").replace("@c.us", "").replace("@lid", "").replace("@g.us", "");
}

/** Derives content type from the media mimetype. */
function contentTypeForMime(mime: string): string {
  const clean = mime.split(";")[0].trim();
  if (clean.startsWith("image/")) return clean === "image/webp" ? "sticker" : "image";
  if (clean.startsWith("video/")) return "video";
  if (clean.startsWith("audio/")) return "audio";
  return "document";
}

/** Pure mapping (no I/O). Media URL is left as the remote WAHA url. */
export function mapWahaMessage(payload: WahaMessagePayload): MappedMessage {
  const from = payload.from ?? "";
  const to = payload.to ?? "";
  const fromMe = payload.fromMe === true;
  const direction = fromMe ? "outbound" : "inbound";

  // For outbound, the conversation partner is the recipient (`to`); for inbound
  // it is the sender (`from`).
  const chatId = fromMe ? to || from : from;
  const isGroup = chatId.endsWith("@g.us");
  const isLid = chatId.endsWith("@lid");
  const waId = chatId;
  const phone = stripSuffix(chatId);

  const ts = Number(payload.timestamp);
  const sentAt = ts > 0 ? new Date(ts * 1000).toISOString() : new Date().toISOString();

  const loc =
    payload.location ??
    payload._data?.Message?.locationMessage ??
    payload._data?.message?.locationMessage;

  let contentType = "text";
  let content = payload.body ?? "";
  let mediaMimeType: string | null = null;
  let mediaFilename: string | null = null;
  let locationLat: string | null = null;
  let locationLng: string | null = null;

  if (loc && (loc as { latitude?: number; degreesLatitude?: number })) {
    const latitude =
      (loc as { latitude?: number }).latitude ??
      (loc as { degreesLatitude?: number }).degreesLatitude;
    const longitude =
      (loc as { longitude?: number }).longitude ??
      (loc as { degreesLongitude?: number }).degreesLongitude;
    if (latitude !== undefined && longitude !== undefined) {
      contentType = "location";
      content = (loc as { name?: string }).name ?? (loc as { address?: string }).address ?? "";
      locationLat = String(latitude);
      locationLng = String(longitude);
    }
  }

  if (contentType !== "location" && payload.media?.url) {
    mediaMimeType = (payload.media.mimetype ?? "application/octet-stream").split(";")[0].trim();
    mediaFilename = payload.media.filename ?? null;
    contentType = contentTypeForMime(mediaMimeType);
    // For media, body is the caption.
    content = payload.body ?? "";
  }

  return {
    waMessageId: payload.id ?? null,
    direction,
    waId,
    phone,
    isLid,
    chatId,
    isGroup,
    contentType,
    content,
    mediaUrl: payload.media?.url ?? null,
    mediaMimeType,
    mediaFilename,
    locationLat,
    locationLng,
    sentAt,
  };
}

/**
 * Downloads media from a WAHA url to ./data/media/{tenantId}/whatsapp/{file} and
 * returns the relative local path (served via the authed /api/media route).
 * Returns null on any failure so ingest continues without the attachment.
 */
export async function downloadMedia(
  tenantId: string,
  url: string,
  mimeType: string,
  filename: string | null,
  fetchImpl: typeof fetch = fetch,
): Promise<string | null> {
  try {
    const res = await fetchImpl(url, { headers: { "X-Api-Key": WAHA_API_KEY } });
    if (!res.ok) {
      return null;
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    const ext = filename?.includes(".") ? filename.split(".").pop()! : extFor(mimeType);
    const name = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const dir = path.join(MEDIA_DIR, tenantId, "whatsapp");
    mkdirSync(dir, { recursive: true });
    await writeFile(path.join(dir, name), buffer);
    // Stored relative path mirrors the supabase bucket layout consumers expect.
    return `${tenantId}/whatsapp/${name}`;
  } catch {
    return null;
  }
}
