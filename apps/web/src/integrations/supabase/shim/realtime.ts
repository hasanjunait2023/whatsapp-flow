/**
 * Realtime adapter replacing supabase-js channels. The server emits coarse
 * { table, tenant_id, payload } change events; this adapter holds ONE connection
 * per tab and dispatches matching events to each channel, parsing `col=eq.val`
 * filter strings.
 *
 * Transport: WebSocket (/api/ws) is the PRIMARY channel. Server-Sent Events
 * (/api/realtime) is an automatic fallback used only if the WebSocket cannot be
 * established (e.g. a proxy that does not pass the Upgrade handshake). While on
 * the SSE fallback the adapter periodically probes WebSocket in the background
 * and upgrades back to it the moment it succeeds — with no realtime gap.
 */

interface ChangeConfig {
  event?: string;
  schema?: string;
  table: string;
  filter?: string;
}

interface ServerChangeEvent {
  table: string;
  tenant_id: string | null;
  payload: Record<string, unknown>;
}

// Payload rows are `any` so existing call sites can cast/destructure them into
// their generated row types exactly as they did with supabase-js.
type ChangeCallback = (payload: {
  eventType: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  new: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  old: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}) => void;

interface Handler {
  config: ChangeConfig;
  callback: ChangeCallback;
}

const channels = new Set<RealtimeChannel>();

// ---------------------------------------------------------------------------
// Gap recovery. A WS/SSE reconnect resets the failure count but the connection
// was DOWN for a window — any change events emitted during that gap are lost.
// On every (re)connect we trigger a refetch of the active data so the UI
// catches up. App.tsx registers a recovery callback wired to the QueryClient.
// ---------------------------------------------------------------------------

let recover: (() => void) | null = null;

/** Registered by App so a (re)connect can invalidate active queries. */
export function setRealtimeRecover(fn: (() => void) | null): void {
  recover = fn;
}

function triggerRecovery(): void {
  if (!active) return;
  try {
    recover?.();
  } catch {
    /* never let recovery throw break the transport */
  }
}

// ---------------------------------------------------------------------------
// Transport manager: WebSocket primary, SSE fallback, self-healing back to WS.
// ---------------------------------------------------------------------------

const MAX_WS_FAILURES = 3; // consecutive WS failures before falling back to SSE
const WS_BACKOFF_MS = [1000, 2000, 4000, 8000, 15000];
const SSE_WS_PROBE_MS = 60_000; // while on SSE, retry WS this often

let ws: WebSocket | null = null;
let sse: EventSource | null = null;
let probeWs: WebSocket | null = null;
let wsFailures = 0;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let probeTimer: ReturnType<typeof setInterval> | null = null;
let active = false; // true while at least one channel is subscribed

function dispatchAll(event: ServerChangeEvent): void {
  for (const ch of channels) ch.dispatch(event);
}

function parseMessage(data: unknown): ServerChangeEvent | null {
  try {
    const msg = JSON.parse(String(data)) as { type?: string; event?: ServerChangeEvent };
    if (msg.type === "postgres_changes" && msg.event) return msg.event;
  } catch {
    /* ignore malformed frame */
  }
  return null;
}

function wsUrl(): string {
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}/api/ws`;
}

function clearReconnect(): void {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
}

function stopProbe(): void {
  if (probeTimer) {
    clearInterval(probeTimer);
    probeTimer = null;
  }
  if (probeWs) {
    probeWs.onopen = null;
    probeWs.onerror = null;
    try {
      probeWs.close();
    } catch {
      /* noop */
    }
    probeWs = null;
  }
}

function closeWs(): void {
  if (ws) {
    ws.onopen = ws.onmessage = ws.onerror = ws.onclose = null;
    try {
      ws.close();
    } catch {
      /* noop */
    }
    ws = null;
  }
}

function closeSse(): void {
  if (sse) {
    sse.close();
    sse = null;
  }
}

function connectWs(): void {
  if (!active) return;
  closeSse();
  let socket: WebSocket;
  try {
    socket = new WebSocket(wsUrl());
  } catch {
    onWsDown();
    return;
  }
  ws = socket;
  socket.onopen = () => {
    wsFailures = 0;
    // Connection (re)established — refetch active data to fill the gap.
    triggerRecovery();
  };
  socket.onmessage = (e) => {
    const event = parseMessage(e.data);
    if (event) dispatchAll(event);
  };
  socket.onerror = () => {
    /* a close event follows; handle there */
  };
  socket.onclose = () => {
    if (ws === socket) ws = null;
    onWsDown();
  };
}

function onWsDown(): void {
  if (!active) return;
  wsFailures += 1;
  if (wsFailures >= MAX_WS_FAILURES) {
    connectSse();
    return;
  }
  const delay = WS_BACKOFF_MS[Math.min(wsFailures - 1, WS_BACKOFF_MS.length - 1)];
  clearReconnect();
  reconnectTimer = setTimeout(connectWs, delay);
}

function connectSse(): void {
  if (!active) return;
  closeWs();
  if (!sse) {
    sse = new EventSource("/api/realtime", { withCredentials: true });
    // EventSource auto-reconnects; fill the gap each time it (re)opens.
    sse.onopen = () => triggerRecovery();
    sse.addEventListener("postgres_changes", (e: MessageEvent) => {
      try {
        dispatchAll(JSON.parse(e.data) as ServerChangeEvent);
      } catch {
        /* ignore malformed frame */
      }
    });
    // EventSource auto-reconnects on error; nothing to wire there.
  }
  // Keep probing WebSocket in the background; upgrade back the moment it works.
  if (!probeTimer) {
    probeTimer = setInterval(tryWsUpgrade, SSE_WS_PROBE_MS);
  }
}

function tryWsUpgrade(): void {
  if (!active || ws || probeWs) return;
  let socket: WebSocket;
  try {
    socket = new WebSocket(wsUrl());
  } catch {
    return;
  }
  probeWs = socket;
  socket.onopen = () => {
    // Probe succeeded — promote it to the primary transport, drop SSE.
    probeWs = null;
    stopProbe();
    closeSse();
    wsFailures = 0;
    ws = socket;
    // Upgraded back to WS — refetch active data to fill any gap.
    triggerRecovery();
    socket.onmessage = (e) => {
      const event = parseMessage(e.data);
      if (event) dispatchAll(event);
    };
    socket.onerror = () => {
      /* close follows */
    };
    socket.onclose = () => {
      if (ws === socket) ws = null;
      onWsDown();
    };
  };
  socket.onerror = () => {
    if (probeWs === socket) probeWs = null;
    try {
      socket.close();
    } catch {
      /* noop */
    }
  };
}

// ---------------------------------------------------------------------------
// Wake / network-restore recovery. After a laptop sleep or a dropped network,
// the existing socket is often a zombie (no close event fired). Force a fresh
// WS connect and refetch active data so the UI recovers promptly.
// ---------------------------------------------------------------------------

function forceReconnect(): void {
  if (!active) return;
  clearReconnect();
  stopProbe();
  closeWs();
  closeSse();
  wsFailures = 0;
  connectWs();
}

function onOnline(): void {
  forceReconnect();
}

function onVisibilityChange(): void {
  if (document.visibilityState === "visible") {
    forceReconnect();
  }
}

let recoveryListenersAttached = false;

function attachRecoveryListeners(): void {
  if (recoveryListenersAttached) return;
  recoveryListenersAttached = true;
  window.addEventListener("online", onOnline);
  document.addEventListener("visibilitychange", onVisibilityChange);
}

function detachRecoveryListeners(): void {
  if (!recoveryListenersAttached) return;
  recoveryListenersAttached = false;
  window.removeEventListener("online", onOnline);
  document.removeEventListener("visibilitychange", onVisibilityChange);
}

/** Opens the realtime connection on first subscribe (WebSocket-first). */
function ensureSource(): void {
  if (active) return;
  active = true;
  wsFailures = 0;
  attachRecoveryListeners();
  connectWs();
}

/** Tears down every transport once no channels remain subscribed. */
function teardownIfIdle(): void {
  if (channels.size > 0) return;
  active = false;
  detachRecoveryListeners();
  clearReconnect();
  stopProbe();
  closeWs();
  closeSse();
}

/** Parses a single PostgREST filter string like "tenant_id=eq.abc". */
function parseFilter(filter?: string): { column: string; value: string } | null {
  if (!filter) return null;
  const match = filter.match(/^([a-zA-Z0-9_]+)=eq\.(.*)$/);
  if (!match) return null;
  return { column: match[1], value: match[2] };
}

export class RealtimeChannel {
  private handlers: Handler[] = [];
  private subscribed = false;

  constructor(public readonly name: string) {}

  on(type: string, config: ChangeConfig, callback: ChangeCallback): this {
    if (type === "postgres_changes") {
      this.handlers.push({ config, callback });
    }
    return this;
  }

  subscribe(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    statusCallback?: (status: string, err?: any) => void,
  ): this {
    if (!this.subscribed) {
      channels.add(this);
      ensureSource();
      this.subscribed = true;
    }
    if (statusCallback) {
      // Mirror supabase-js: report subscribed on next tick.
      setTimeout(() => statusCallback("SUBSCRIBED"), 0);
    }
    return this;
  }

  dispatch(event: ServerChangeEvent): void {
    for (const handler of this.handlers) {
      if (handler.config.table !== event.table) continue;
      const flt = parseFilter(handler.config.filter);
      if (flt) {
        const actual = event.payload?.[flt.column];
        if (actual != null && String(actual) !== flt.value) continue;
      }
      handler.callback({
        eventType: (event.payload?.eventType as string) ?? "*",
        new: event.payload ?? {},
        old: event.payload ?? {},
      });
    }
  }

  unsubscribe(): void {
    channels.delete(this);
    this.subscribed = false;
    teardownIfIdle();
  }
}

export function createChannel(name: string): RealtimeChannel {
  return new RealtimeChannel(name);
}

export function removeChannel(channel: RealtimeChannel): void {
  channel.unsubscribe();
}
