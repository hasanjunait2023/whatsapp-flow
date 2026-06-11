import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import type { RealtimeChangeEvent } from "@whatsapp-flow/shared";
import { getTenant } from "../middleware/tenant.js";
import { realtimeBus, CHANGE_EVENT } from "./emitter.js";

export const realtimeRoute = new Hono();

const HEARTBEAT_MS = 25_000;

/**
 * GET /api/realtime — one multiplexed SSE stream per authed tab.
 * Forwards change events for the connection's tenant (admins receive all).
 * Sends a heartbeat comment every 25s to keep proxies from closing the stream.
 */
realtimeRoute.get("/", (c) => {
  const ctx = getTenant(c);

  return streamSSE(c, async (stream) => {
    let closed = false;

    const onChange = (event: RealtimeChangeEvent) => {
      if (closed) return;
      if (!ctx.isAdmin && event.tenant_id && event.tenant_id !== ctx.tenantId) {
        return;
      }
      void stream.writeSSE({
        event: "postgres_changes",
        data: JSON.stringify(event),
      });
    };

    realtimeBus.on(CHANGE_EVENT, onChange);

    const heartbeat = setInterval(() => {
      if (closed) return;
      void stream.writeSSE({ event: "heartbeat", data: String(Date.now()) });
    }, HEARTBEAT_MS);

    await stream.writeSSE({ event: "ready", data: JSON.stringify({ ok: true }) });

    stream.onAbort(() => {
      closed = true;
      clearInterval(heartbeat);
      realtimeBus.off(CHANGE_EVENT, onChange);
    });

    // Keep the stream open until aborted.
    while (!closed) {
      await stream.sleep(HEARTBEAT_MS);
    }
  });
});
