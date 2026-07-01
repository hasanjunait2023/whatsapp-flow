/**
 * Lightweight Prometheus-format metrics for whatsapp-flow.
 *
 * Why not prom-client? It's a heavy dep for what we need. The format spec is
 * trivial — one metric per line with HELP/TYPE comments — and our surface area
 * is small (request counters, error counters, queue depth, real-time connection
 * counts, basic process gauges). Counting is done with plain Maps; aggregation
 * runs on /metrics scrape. No background timers.
 *
 * DESIGN:
 *   - Counters:   metricName{labels...} = +1 on every observation
 *   - Gauges:     metricName{labels...} = <current value> on /metrics scrape
 *   - Histograms: not exposed yet — add later if/when latency SLOs become a thing.
 *
 * Stability:
 *   The 30s scrape interval matches prometheus.yml's scrape_interval. Gauges
 *   always return the live value, never accumulate, so no reset logic.
 */

import { realtimeBus, CHANGE_EVENT } from "../realtime/emitter.js";
import { dbGet, dbRun } from "../db/raw.js";

/* ============================================================================
 * Counters (thread-safe enough — Node single-threaded, just increment-and-track)
 * ========================================================================== */

type CounterKey = string; // "metricName{label=value,...}"

const counters = new Map<CounterKey, number>();
const counterDefs = new Map<string, { help: string; type: "counter" }>();

/**
 * Define a counter once at module load. Idempotent (same name -> no-op so re-imports
 * during dev hot-reload don't double-register). Returns the metric name for chained
 * calls.
 */
export function defineCounter(name: string, help: string): string {
  if (!counterDefs.has(name)) {
    counterDefs.set(name, { help, type: "counter" });
  }
  return name;
}

/**
 * Increment a counter. Labels are flattened in declaration order for stable
 * output — caller passes an object { method: "GET", status: "200" } and we sort
 * keys alphabetically so Prometheus sees a single time-series for the same
 * label combination.
 */
export function incCounter(
  name: string,
  labels: Record<string, string> = {},
  by = 1,
): void {
  const key = serializeKey(name, labels);
  counters.set(key, (counters.get(key) ?? 0) + by);
}

/* ============================================================================
 * Gauges (computed live on each scrape)
 * ========================================================================== */

type GaugeRow = Record<string, string | number>;
type GaugeFn = () => Promise<GaugeRow[]> | GaugeRow[];
interface GaugeDef {
  name: string;
  help: string;
  // Returns { label1: "x", label2: "y", value: 42 } pairs; the "value" key is the gauge number.
  // All other keys become labels. Multiple rows -> multiple label sets.
  collect: GaugeFn;
}
const gaugeDefs: GaugeDef[] = [];

/**
 * Register a gauge. `collect` runs on each scrape; it returns one or more rows
 * of {labelKey: "labelValue", ...value: number}. The function form lets us defer
 * heavy queries (Postgres queue depth, PgBouncer SHOW POOLS parse) to scrape time
 * only — zero overhead on the request hot path.
 */
export function defineGauge(name: string, help: string, collect: GaugeFn): void {
  gaugeDefs.push({ name, help, collect });
}

/* ============================================================================
 * Pre-defined metrics
 * ========================================================================== */

// HTTP requests: increment per request in the global timing middleware.
// Labels: method, route (path template), status (3-digit).
defineCounter(
  "whatsappflow_http_requests_total",
  "HTTP requests served, labeled by method, route, and status code",
);

// Errors: increments from captureError() (server-side errors only — client errors
// are tracked separately via the clientErrorsRoute metric).
defineCounter(
  "whatsappflow_errors_total",
  "Server errors captured, labeled by source module and severity",
);

// Background job lifecycle: incremented on enqueue and on completion.
// Labels: kind (job kind name), outcome ("ok" | "fail").
defineCounter(
  "whatsflow_jobs_total",
  "Background jobs processed, labeled by kind and outcome (ok/fail)",
);

// Active WebSocket + SSE connections (gauges — set by the routes below).
// Tracked as gauges because they reflect live counts, not cumulative.
let activeWsConns = 0;
let activeSseConns = 0;
export function wsConnOpened(): void {
  activeWsConns++;
}
export function wsConnClosed(): void {
  if (activeWsConns > 0) activeWsConns--;
}
export function sseConnOpened(): void {
  activeSseConns++;
}
export function sseConnClosed(): void {
  if (activeSseConns > 0) activeSseConns--;
}

defineGauge(
  "whatsappflow_realtime_connections",
  "Currently open WebSocket and SSE connections",
  () => [
    { transport: "ws", value: activeWsConns },
    { transport: "sse", value: activeSseConns },
  ],
);

// Process memory — Node's RSS, heap, external. Cheap to read; useful in dashboards.
defineGauge(
  "whatsappflow_process_memory_bytes",
  "Node.js process memory in bytes (rss, heapUsed, heapTotal, external)",
  () => {
    const m = process.memoryUsage();
    return [
      { type: "rss", value: m.rss },
      { type: "heap_used", value: m.heapUsed },
      { type: "heap_total", value: m.heapTotal },
      { type: "external", value: m.external },
    ];
  },
);

// Process uptime + versions.
defineGauge(
  "whatsappflow_process_uptime_seconds",
  "Uptime of the app process in seconds, labeled by Node.js version",
  () => {
    const v = process.versions.node;
    return [{ node_version: v, value: process.uptime() }];
  },
);

// Realtime change events — counts how many tenant-scoped broadcasts happened.
let realtimeEventsEmitted = 0;
realtimeBus.on(CHANGE_EVENT, () => {
  realtimeEventsEmitted++;
});
defineGauge(
  "whatsappflow_realtime_events_emitted_total",
  "Cumulative count of realtime change events broadcast in-process (no cross-instance)",
  () => [{ value: realtimeEventsEmitted }],
);

// Job queue depth (Postgres-backed queue): one snapshot at scrape time. If the
// scrape ever hangs (DB slow) we silently skip — metrics must never block.
defineGauge(
  "whatsappflow_job_queue_depth",
  "Open job_queue rows by status (queued, running)",
  async () => {
    try {
      const rows = (await dbGet(
        `SELECT status, count(*)::int as n FROM job_queue GROUP BY status`,
      )) as Array<{ status: string; n: number }>;
      const byStatus = new Map<string, number>();
      for (const row of rows || []) byStatus.set(row.status, row.n);
      return [
        { status: "queued", value: byStatus.get("queued") ?? 0 },
        { status: "running", value: byStatus.get("running") ?? 0 },
      ];
    } catch {
      return [];
    }
  },
);

/* ============================================================================
 * Renderer
 * ========================================================================== */

function serializeKey(name: string, labels: Record<string, string>): string {
  const keys = Object.keys(labels).sort();
  if (keys.length === 0) return name;
  const parts = keys.map((k) => `${k}=${escapeLabelValue(labels[k])}`);
  return name + "{" + parts.join(",") + "}";
}

function escapeLabelValue(v: string): string {
  // Prometheus 0.0.4 text-format requires EVERY label value to be wrapped in
  // double-quotes, with `\`, `\n`, and `"` inside them escaped. The bare form
  // ({k=v}) is reserved for special `le`/`quantile` label-names on histograms
  // and summaries and is otherwise rejected with:
  //   "expected label value, got X (INVALID)"
  // — which is exactly what we saw in the Prom error log. Always quoting also
  // sidesteps a bug where route values like `/api/auth/*` contain `/` and `*`,
  // both of which the bare-value parser chokes on.
  return (
    '"' +
    v.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/"/g, '\\"') +
    '"'
  );
}

/**
 * Render the /metrics body. Format: Prometheus plain-text — see
 * https://prometheus.io/docs/instrumenting/exposition_formats/#text-based-format
 */
export async function renderMetrics(): Promise<string> {
  const lines: string[] = [];

  // 1. Counters
  for (const [name, def] of counterDefs) {
    lines.push(`# HELP ${name} ${def.help}`);
    lines.push(`# TYPE ${name} counter`);
  }
  // Now emit values grouped by metric name with consistent labels.
  const counterByName = new Map<string, Array<{ key: string; value: number }>>();
  for (const [k, v] of counters) {
    const name = k.includes("{") ? k.slice(0, k.indexOf("{")) : k;
    const entry = { key: k, value: v };
    const arr = counterByName.get(name) ?? [];
    arr.push(entry);
    counterByName.set(name, arr);
  }
  for (const [name, entries] of counterByName) {
    for (const e of entries) {
      lines.push(e.key + " " + e.value);
    }
  }

  // 2. Gauges
  for (const def of gaugeDefs) {
    try {
      const rows = await def.collect();
      lines.push(`# HELP ${def.name} ${def.help}`);
      lines.push(`# TYPE ${def.name} gauge`);
      for (const row of rows) {
        const { value, ...labels } = row;
        const keys = Object.keys(labels).sort();
        const labelPart =
          keys.length === 0
            ? ""
            : "{" + keys.map((k) => `${k}=${escapeLabelValue(String(labels[k]))}`).join(",") + "}";
        lines.push(`${def.name}${labelPart} ${value}`);
      }
    } catch {
      // Gauge failed to collect — emit a single bogus value so Prometheus shows a gap
      // rather than hiding the metric entirely. Better than silent removal.
      lines.push(`# HELP ${def.name} ${def.help}`);
      lines.push(`# TYPE ${def.name} gauge`);
      lines.push(`${def.name}{collect_error="1"} 0`);
    }
  }

  return lines.join("\n") + "\n";
}

/* ============================================================================
 * HTTP request tracker — middleware-friendly hook.
 * ========================================================================== */

/**
 * Hook for the global request-timing middleware to call. Increments the
 * `whatsappflow_http_requests_total` counter with method/route/status labels.
 */
export function trackRequest(method: string, route: string, status: number): void {
  incCounter("whatsappflow_http_requests_total", {
    method: method.toUpperCase(),
    route: route || "unknown",
    status: String(status),
  });
}

export function trackError(module: string, severity: "error" | "fatal" | "warn"): void {
  incCounter("whatsappflow_errors_total", {
    module,
    severity,
  });
}

export function trackJob(kind: string, outcome: "ok" | "fail"): void {
  incCounter("whatsflow_jobs_total", {
    kind,
    outcome,
  });
}
