import { dbAll, dbRun } from "../db/raw.js";
import { emitChange } from "../realtime/emitter.js";
import { wahaClient, sessionNameForInstance, type WahaSessionStatus } from "../waha/client.js";

/**
 * WAHA session health job. Periodically pings each non-deleted instance's WAHA
 * session; auto-restarts FAILED/STOPPED sessions, syncs whatsapp_instances.status,
 * and emits SSE so the UI reflects reconnects. Designed to run every few minutes.
 */

interface InstanceRow {
  id: string;
  tenant_id: string;
  status: string;
}

function mapStatus(status: WahaSessionStatus): string {
  return status === "WORKING" ? "active" : "disconnected";
}

/** Runs one health sweep over all connectable instances. */
export async function runWahaHealthCheck(): Promise<void> {
  const instances = (await dbAll(
    `SELECT id, tenant_id, status FROM whatsapp_instances
       WHERE session_id IS NOT NULL AND (is_deleted IS NOT TRUE)`,
  )) as InstanceRow[];

  for (const instance of instances) {
    const sessionName = sessionNameForInstance(instance.id);
    try {
      const session = await wahaClient.getSession(sessionName);

      if (session.status === "FAILED" || session.status === "STOPPED") {
        // Self-heal: attempt a restart.
        await wahaClient.startSession(sessionName).catch(() => undefined);
      }

      const newStatus = mapStatus(session.status);
      if (newStatus !== instance.status) {
        await dbRun(
          "UPDATE whatsapp_instances SET status = ?, last_status_at = ? WHERE id = ?",
          newStatus,
          new Date().toISOString(),
          instance.id,
        );
        emitChange("whatsapp_instances", instance.tenant_id, {
          id: instance.id,
          status: newStatus,
        });
      }
    } catch (error) {
      // WAHA unreachable or session missing — mark disconnected once.
      if (instance.status !== "disconnected") {
        const message = error instanceof Error ? error.message : "health check failed";
        await dbRun(
          "UPDATE whatsapp_instances SET status = 'disconnected', connection_error = ?, last_status_at = ? WHERE id = ?",
          message,
          new Date().toISOString(),
          instance.id,
        );
        emitChange("whatsapp_instances", instance.tenant_id, {
          id: instance.id,
          status: "disconnected",
        });
      }
    }
  }
}
