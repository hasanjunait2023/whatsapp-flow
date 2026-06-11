/**
 * SSE-backed realtime adapter replacing supabase-js channels. The server emits
 * coarse { table, tenant_id, payload } change events over a single EventSource
 * at /api/realtime. Each channel registers postgres_changes handlers and the
 * adapter dispatches matching events, parsing `col=eq.val` filter strings.
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

type ChangeCallback = (payload: {
  eventType: string;
  new: Record<string, unknown>;
  old: Record<string, unknown>;
}) => void;

interface Handler {
  config: ChangeConfig;
  callback: ChangeCallback;
}

let source: EventSource | null = null;
const channels = new Set<RealtimeChannel>();

function ensureSource(): void {
  if (source) return;
  source = new EventSource("/api/realtime", { withCredentials: true });
  source.addEventListener("postgres_changes", (e: MessageEvent) => {
    let event: ServerChangeEvent;
    try {
      event = JSON.parse(e.data) as ServerChangeEvent;
    } catch {
      return;
    }
    for (const ch of channels) ch.dispatch(event);
  });
}

function teardownIfIdle(): void {
  if (channels.size === 0 && source) {
    source.close();
    source = null;
  }
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

  subscribe(statusCallback?: (status: string) => void): this {
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
