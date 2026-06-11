import { EventEmitter } from "node:events";
import type { RealtimeChangeEvent } from "@whatsapp-flow/shared";

/**
 * In-process realtime change bus. Webhook/ingest paths call emitChange(); the SSE
 * route subscribes per connection and forwards events for the connection's tenant.
 */
class RealtimeBus extends EventEmitter {}

export const realtimeBus = new RealtimeBus();
realtimeBus.setMaxListeners(0);

export const CHANGE_EVENT = "change";

/** Broadcasts a coarse change event for a table within a tenant. */
export function emitChange(
  table: string,
  tenantId: string | null,
  payload: Record<string, unknown> = {},
): void {
  const event: RealtimeChangeEvent = { table, tenant_id: tenantId, payload };
  realtimeBus.emit(CHANGE_EVENT, event);
}
