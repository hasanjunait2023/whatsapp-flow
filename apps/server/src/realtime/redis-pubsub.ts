/**
 * Cross-instance realtime transport — Redis Pub/Sub bridge.
 *
 * Goal: a realtime event emitted by app instance B reaches WebSocket/SSE clients
 *       connected to instance A. Without this, scale-out silently breaks UX.
 *
 * Design (safe by default):
 *  - The in-process `realtimeBus` (a Node EventEmitter) keeps working unchanged.
 *    This module ADDS a bridge on top: on every local `CHANGE_EVENT`, also
 *    publish JSON to Redis channel `wf:realtime`. We also SUBSCRIBE on the
 *    same channel; messages received from OTHER instances are re-emitted on
 *    the local bus exactly as if they had been emitted here.
 *  - If Redis is unreachable, the local bus continues to function. We log the
 *    failure once via console.warn and then disable the bridge (no per-emit
 *    retry storm, no silent log spam).
 *  - All subscriptions happen exactly once per process; the module is a no-op
 *    on subsequent imports (singleton pattern via module-level state).
 *  - Loop prevention: every published message carries the emitter's instance
 *    ID in its envelope. We strip our own ID out before re-emitting on the
 *    local bus, so a Redis-bridge-subscribed local bus can NEVER echo its own
 *    output back through Redis (avoids an infinite re-broadcast loop).
 *
 * Wire-protocol: tiny JSON envelope `{id, payload}`; payload carries the same
 * `RealtimeChangeEvent` the local bus already carries.
 *
 * Channels:
 *   wf:realtime     — broadcast change events (any tenant)
 *
 * Tenant filtering for multi-tenant isolation happens at the SSE/WS layer
 * (only events for *this* connection's tenant are forwarded), so we publish
 * once and filter on every subscribed instance. The wire volume at launch is
 * tiny (< 1 msg/s/tenant).
 */
import { createClient, type RedisClientType } from "redis";
import { realtimeBus, CHANGE_EVENT } from "./emitter.js";
import type { RealtimeChangeEvent } from "@whatsapp-flow/shared";
import { hostname as osHostname } from "node:os";

const CHANNEL = "wf:realtime";
const REDIS_URL_ENV = "REDIS_URL";

// One per process. Stable across reconnects within the same process lifetime
// (regenerated only on restart), so each app instance has a unique ID that
// survives temporary reconnects but never accidentally matches a peer's.
const INSTANCE_ID = `wf-${osHostname()}-${process.pid}-${Date.now().toString(36)}`;

interface Envelope {
  id: string;            // emitter instance id
  payload: RealtimeChangeEvent;
}

// ── internal state (module-singleton) ────────────────────────────────────────
let subscriber: RedisClientType | null = null;
let publisher: RedisClientType | null = null;
let connectPromise: Promise<void> | null = null;
let bridgeDisabled = false; // set true after one failed connection attempt
let bridgeDisabledLogged = false; // avoid log spam

/**
 * Connect to Redis and wire up the pub/sub bridge. Idempotent: calling this
 * twice is a no-op. Safe to call from index.ts startup.
 *
 * If REDIS_URL is unset or connection fails, returns without throwing — the
 * rest of the app continues to work in single-instance mode.
 */
export async function initRedisBridge(): Promise<void> {
  // Idempotent
  if (subscriber && publisher) return;
  if (connectPromise) return connectPromise;
  if (bridgeDisabled) return;

  const url = process.env[REDIS_URL_ENV] ?? "redis://redis:6379";

  connectPromise = (async () => {
    try {
      publisher = createClient({ url }) as RedisClientType;
      subscriber = createClient({ url }) as RedisClientType;

      publisher.on("error", (err) => {
        if (!bridgeDisabledLogged) {
          console.warn(
            `[realtime/redis] publisher error: ${err.message} — bridge disabled for this process. Single-instance mode.`,
          );
          bridgeDisabledLogged = true;
        }
        bridgeDisabled = true;
      });
      subscriber.on("error", (err) => {
        if (!bridgeDisabledLogged) {
          console.warn(
            `[realtime/redis] subscriber error: ${err.message} — bridge disabled for this process. Single-instance mode.`,
          );
          bridgeDisabledLogged = true;
        }
        bridgeDisabled = true;
      });

      await publisher.connect();
      await subscriber.connect();

      // ── forward LOCAL events → Redis channel ───────────────────────────────
      realtimeBus.on(CHANGE_EVENT, (event: RealtimeChangeEvent) => {
        if (bridgeDisabled || !publisher?.isOpen) return;
        const envelope: Envelope = { id: INSTANCE_ID, payload: event };
        void publisher
          .publish(CHANNEL, JSON.stringify(envelope))
          .catch((err: Error) => {
            if (!bridgeDisabledLogged) {
              console.warn(
                `[realtime/redis] publish failed: ${err.message} — dropping bridge.`,
              );
              bridgeDisabledLogged = true;
            }
            bridgeDisabled = true;
          });
      });

      // ── receive Redis messages → re-emit on LOCAL bus ──────────────────────
      await subscriber.subscribe(CHANNEL, (msg: string) => {
        let env: Envelope;
        try {
          env = JSON.parse(msg) as Envelope;
        } catch {
          return; // bad payload — drop
        }
        // Skip self-origin to avoid echo-loop (this same process published it)
        if (!env || !env.id || env.id === INSTANCE_ID) return;
        if (!env.payload || typeof env.payload.table !== "string") return;
        // Re-emit on the local bus. Listeners (SSE/WS routes) see this as a
        // normal local event and apply their tenant filter as usual.
        realtimeBus.emit(CHANGE_EVENT, env.payload);
      });

      console.log(
        `[realtime/redis] bridge connected (${redactUrl(url)}) instance=${INSTANCE_ID}`,
      );
    } catch (err) {
      const m = err instanceof Error ? err.message : String(err);
      if (!bridgeDisabledLogged) {
        console.warn(
          `[realtime/redis] connect failed: ${m} — single-instance mode. (Set REDIS_URL env to enable.)`,
        );
        bridgeDisabledLogged = true;
      }
      bridgeDisabled = true;
      try {
        await publisher?.disconnect();
      } catch {
        /* */
      }
      try {
        await subscriber?.disconnect();
      } catch {
        /* */
      }
      publisher = null;
      subscriber = null;
    } finally {
      connectPromise = null;
    }
  })();

  return connectPromise;
}

/** Used in tests / clean shutdown — closes both clients. */
export async function shutdownRedisBridge(): Promise<void> {
  try {
    await subscriber?.unsubscribe(CHANNEL);
  } catch {
    /* */
  }
  try {
    await subscriber?.quit();
  } catch {
    /* */
  }
  try {
    await publisher?.quit();
  } catch {
    /* */
  }
  subscriber = null;
  publisher = null;
  bridgeDisabled = false;
  bridgeDisabledLogged = false;
}

function redactUrl(url: string): string {
  // Strip any password before logging. We don't expect one (compose-network
  // only), but logging it on the wire is still a smell.
  return url.replace(/(redis:\/\/)[^@/]+@/, "$1****@");
}
