import type { Context } from "hono";
import type { WSContext } from "hono/ws";
import type { RealtimeChangeEvent } from "@whatsapp-flow/shared";
import { getTenant } from "../middleware/tenant.js";
import { realtimeBus, CHANGE_EVENT } from "./emitter.js";

const HEARTBEAT_MS = 25_000;

/**
 * WebSocket realtime transport — the primary channel (SSE at /api/realtime stays
 * as an automatic fallback). Mounted under /api so tenantMiddleware authenticates
 * the upgrade request via the session cookie before the socket opens.
 *
 * Wire protocol (server -> client) mirrors the SSE events so the client shim can
 * share one dispatch path:
 *   { type: "ready" }
 *   { type: "postgres_changes", event: RealtimeChangeEvent }
 *   { type: "heartbeat", t: number }
 */
export function realtimeWsEvents(c: Context) {
  // Resolved by tenantMiddleware during the upgrade request.
  const ctx = getTenant(c);

  let onChange: ((event: RealtimeChangeEvent) => void) | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;

  const cleanup = (): void => {
    if (onChange) {
      realtimeBus.off(CHANGE_EVENT, onChange);
      onChange = null;
    }
    if (heartbeat) {
      clearInterval(heartbeat);
      heartbeat = null;
    }
  };

  const safeSend = (ws: WSContext, data: unknown): void => {
    try {
      ws.send(JSON.stringify(data));
    } catch {
      // Socket already closing; the close handler will clean up.
    }
  };

  return {
    onOpen(_evt: Event, ws: WSContext) {
      onChange = (event: RealtimeChangeEvent) => {
        // Admins receive all tenants; everyone else only their own.
        if (!ctx.isAdmin && event.tenant_id && event.tenant_id !== ctx.tenantId) {
          return;
        }
        safeSend(ws, { type: "postgres_changes", event });
      };
      realtimeBus.on(CHANGE_EVENT, onChange);

      heartbeat = setInterval(() => safeSend(ws, { type: "heartbeat", t: Date.now() }), HEARTBEAT_MS);

      safeSend(ws, { type: "ready" });
    },
    onClose() {
      cleanup();
    },
    onError() {
      cleanup();
    },
  };
}
