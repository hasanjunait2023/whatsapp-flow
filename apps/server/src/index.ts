import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { createNodeWebSocket } from "@hono/node-ws";
import { Hono } from "hono";
import { secureHeaders } from "hono/secure-headers";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { dbGet, dbRun } from "./db/raw.js";
import { closePool } from "./db/index.js";
import { logger } from "./lib/logger.js";
import { captureError } from "./lib/error-tracking.js";
import { rateLimit } from "./lib/rate-limit.js";
import { checkResourcePressure } from "./lib/system-alerts.js";
import { clientErrorsRoute } from "./routes/client-errors.js";
import { reapStuckJobs } from "./jobs/queue.js";
import { getTenant } from "./middleware/tenant.js";
import { auth } from "./auth/index.js";
import { tenantMiddleware } from "./middleware/tenant.js";
import { queryRoute } from "./routes/query.js";
import { rpcRoute } from "./routes/rpc.js";
import { fnRoute } from "./routes/fn.js";
import { mediaRoute } from "./routes/media.js";
import { realtimeRoute } from "./realtime/sse.js";
import { realtimeWsEvents } from "./realtime/ws.js";
import { initRedisBridge } from "./realtime/redis-pubsub.js";
import { llmSettingsRoute } from "./routes/llm-settings.js";
import { adminBillingRoute } from "./routes/admin-billing.js";
import { wahaWebhookRoute } from "./routes/waha/webhook.js";
import { telegramWebhookRoute } from "./routes/webhooks/telegram.js";
import { fbWebhookRoute, warnIfFbPagesUnverified } from "./routes/webhooks/fb.js";
import { fbOauthStartRoute, fbOauthCallbackRoute } from "./routes/fb-oauth.js";
import { fbDataDeletionRoute } from "./routes/fb-data-deletion.js";
import { woocommerceWebhookRoute } from "./routes/webhooks/woocommerce.js";
import { salesWebhookRoute } from "./routes/webhooks/sales.js";
import { startScheduler, stopScheduler } from "./jobs/scheduler.js";
import { registerSoulJobs } from "./services/soul/index.js";
import { registerHermesPipeline } from "./services/hermes/pipeline.js";
import { registerCeoJobs } from "./services/ceo/index.js";
import { registerGrowthJobs } from "./services/growth/index.js";
import { enrollLeadInFunnel } from "./services/growth/funnel.js";
import { sendEmail } from "./lib/email.js";
import { registerOptOutHandler } from "./services/opt-out.js";
import { registerBulkSend } from "./services/bulk-send.js";
import { trackRequest, renderMetrics } from "./lib/metrics.js";
import { seedPlansIfEmpty } from "./services/billing/seed-plans.js";
import {
  PORT,
  IS_PRODUCTION,
  WEB_DIST_DIR,
  warnIfWebhookUnverified,
  warnIfTelegramWebhookUnverified,
  getMasterKey,
  WAHA_WEBHOOK_HMAC_ENFORCED,
  TELEGRAM_WEBHOOK_SECRET,
  TELEGRAM_BOT_TOKEN,
  RESEND_API_KEY,
} from "./lib/env.js";

// Fail fast at startup (production only) if the secret-encryption key is missing
// or malformed. Without this, MASTER_KEY is validated lazily on the first
// encryptSecret() call (e.g. a tenant saving an API key), surfacing as a
// confusing mid-request 500 instead of a clean boot failure.
if (IS_PRODUCTION) {
  getMasterKey();
  if (!RESEND_API_KEY) {
    throw new Error(
      "RESEND_API_KEY is not set. Transactional email (password reset, notifications) will be silently dropped. Set RESEND_API_KEY before starting in production.",
    );
  }
  // Production runs WAHA Plus, which signs webhooks. Refuse to boot accepting
  // unauthenticated webhooks — a missing HMAC secret in prod is a hard error,
  // not a warning (an attacker who knows an instance id could inject events).
  if (!WAHA_WEBHOOK_HMAC_ENFORCED) {
    throw new Error(
      "WAHA webhook HMAC is not enforced in production. Set WAHA_WEBHOOK_HMAC_SECRET " +
        "(or WAHA_WEBHOOK_REQUIRE_HMAC=true) before starting.",
    );
  }
  // The Telegram webhook is the transport gate for the growth approval buttons.
  // Only required when Telegram is actually configured (a bot token is set): if
  // the bot is in use, a missing secret token means the webhook fails closed, so
  // refuse to boot. With no bot token Telegram is simply off and the secret is
  // irrelevant — don't crash a deployment that doesn't use Telegram.
  if (TELEGRAM_BOT_TOKEN && !TELEGRAM_WEBHOOK_SECRET) {
    throw new Error(
      "TELEGRAM_WEBHOOK_SECRET is not set but TELEGRAM_BOT_TOKEN is. Set the secret (and " +
        "register it via setWebhook secret_token) before starting, or the Telegram webhook rejects every update.",
    );
  }
}

// Per-request correlation id, attached by the logging middleware below.
declare module "hono" {
  interface ContextVariableMap {
    requestId: string;
  }
}

const app = new Hono();

// WebSocket upgrade plumbing for the Node server. `upgradeWebSocket` is used on
// the /api/ws route below; `injectWebSocket` is attached to the http server
// returned by serve() so the realtime WS shares the app's port (no extra port).
const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });

// --- security headers --------------------------------------------------------
// Built-in Hono middleware: nosniff, X-Frame-Options DENY, Referrer-Policy, HSTS
// (edge serves HTTPS), plus a CSP. The SPA is bundled by Vite (no external
// scripts) so script-src 'self' is safe; style/img/connect are kept permissive
// enough not to break the dashboard (inline styles, external/data images, SSE/WS).
app.use(
  "*",
  secureHeaders({
    contentSecurityPolicy: {
      defaultSrc: ["'self'"],
      // 'unsafe-inline' is required by index.html: a no-flash bootstrap <script>
      // and the font-preload link's inline `onload=` handler (inline event
      // handlers can't be allowed by a hash). cloudflareinsights = CF analytics
      // beacon injected at the edge. React auto-escapes and the app uses no
      // dangerouslySetInnerHTML, keeping the XSS surface low despite this.
      scriptSrc: ["'self'", "'unsafe-inline'", "https://static.cloudflareinsights.com"],
      // Google Fonts stylesheet origin + inline styles (Tailwind/React).
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      fontSrc: ["'self'", "data:", "https:"], // fonts.gstatic.com
      connectSrc: ["'self'", "https:", "wss:"], // API, CF beacon, WebSocket
      mediaSrc: ["'self'", "data:", "blob:", "https:"],
      // YouTube embed for the in-app product tour / demo video.
      frameSrc: ["'self'", "https://www.youtube.com", "https://www.youtube-nocookie.com"],
      frameAncestors: ["'none'"], // clickjacking protection
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
    },
  }),
);

// --- request logging (structured, correlation id) ---------------------------
// Logs only /api traffic (skips static assets). Attaches a short request id to
// the context so handlers / onError / captureError can correlate.
app.use("/api/*", async (c, next) => {
  const requestId = crypto.randomUUID().slice(0, 8);
  c.set("requestId", requestId);
  const start = Date.now();
  await next();
  logger.info("request", {
    request_id: requestId,
    method: c.req.method,
    path: c.req.path,
    status: c.res.status,
    ms: Date.now() - start,
  });
  // Increment the http_requests_total counter with the canonical "route" key
  // (Hono's .routePath or .path; falls back to "unknown" for unmatched routes).
  // /healthz and /metrics are excluded — they're scraped by Prometheus, not
  // real traffic.
  const url = c.req.path;
  if (!url.startsWith("/metrics") && !url.startsWith("/healthz")) {
    trackRequest(
      c.req.method,
      (c.req as unknown as { routePath?: string }).routePath ?? url,
      c.res.status,
    );
  }
});

// --- global error handler ----------------------------------------------------
// Anything that throws out of a handler lands here: record it (DB + ops alert),
// log it, and return a generic 500 — never leak internal error text/stack.
//
// Pool exhaustion (connectionTimeoutMillis exceeded) is a transient overload
// condition, not a bug — return 503 so clients/CDNs know to retry.
app.onError((err, c) => {
  const requestId = (c.get("requestId") as string | undefined) ?? null;
  const msg = err instanceof Error ? err.message : String(err);
  const isPoolTimeout = msg.includes("timeout exceeded when trying to connect");

  if (isPoolTimeout) {
    logger.warn("pool_exhausted", { request_id: requestId ?? undefined, path: c.req.path });
    return c.json({ error: { message: "Service temporarily overloaded, please retry" } }, 503);
  }

  void captureError(err, {
    source: "backend",
    url: c.req.path,
    requestId,
    meta: { method: c.req.method },
  });
  logger.error("unhandled_error", {
    request_id: requestId ?? undefined,
    path: c.req.path,
    msg_preview: msg,
  });
  return c.json({ error: { message: "Internal server error" } }, 500);
});

// --- health ----------------------------------------------------------------
// HTTP status rules:
//   200 — process is alive and DB is reachable (or pool is just busy)
//   503 — DB is genuinely unreachable (disk failure, container crash)
//
// Pool exhaustion (connectionTimeoutMillis hit during a load spike) MUST NOT
// return 503: docker would mark the container unhealthy, stop routing traffic
// to it, and potentially restart — exactly the wrong response to overload.
app.get("/healthz", async (c) => {
  let dbOk = false;
  let dbNote: string | undefined;
  try {
    await dbGet("SELECT 1");
    dbOk = true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("timeout exceeded when trying to connect")) {
      // Pool busy — process is healthy, just under load. Report degraded but
      // return 200 so docker doesn't force-restart a healthy container.
      dbOk = true;
      dbNote = "pool_busy";
    } else {
      dbOk = false;
    }
  }
  const mem = process.memoryUsage();
  const body: Record<string, unknown> = {
    status: dbOk ? (dbNote ? "degraded" : "ok") : "down",
    db: dbOk,
    rss: mem.rss,
    heapUsed: mem.heapUsed,
    uptime: process.uptime(),
  };
  if (dbNote) body.dbNote = dbNote;
  return c.json(body, dbOk ? 200 : 503);
});

// --- prometheus metrics -----------------------------------------------------
// Open endpoint by design: Prometheus scrapes from inside the docker network
// only. No authentication, but only listens on 127.0.0.1:3500 from the host —
// nginx + cloudflare never expose /metrics to the internet. If we ever scale
// to multi-instance, every instance needs a Prometheus target so the scraper
// does the aggregation, not us.
app.get("/metrics", async (c) => {
  const body = await renderMetrics();
  return new Response(body, {
    headers: { "Content-Type": "text/plain; version=0.0.4" },
  });
});

// --- auth (better-auth mounts its own handler under /api/auth) ---------------
// Rate-limit auth by IP to blunt credential-stuffing / brute-force.
app.use("/api/auth/*", rateLimit({ name: "auth", windowMs: 60_000, max: 30 }));
app.on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw));

// --- client error sink (public; pre-auth crashes too) ------------------------
app.use("/api/client-errors", rateLimit({ name: "client-errors", windowMs: 60_000, max: 20 }));
app.route("/api/client-errors", clientErrorsRoute);

// --- WAHA webhook (machine caller; no session middleware) --------------------
// Authenticated by instance id + optional HMAC, not by a user session.
app.route("/api/waha/webhook", wahaWebhookRoute);

// --- Telegram webhook (machine caller; secret-token validated) ---------------
app.route("/api/telegram/webhook", telegramWebhookRoute);

// --- Facebook webhook (machine caller; verify-token + per-page HMAC) ----------
app.route("/api/webhooks/fb", fbWebhookRoute);

// --- WooCommerce order webhook (machine caller; tenant_id query + optional HMAC) ---
app.route("/api/webhooks/woocommerce", woocommerceWebhookRoute);

// --- External sales webhook (machine caller; X-Sales-Webhook-Secret header) ---
app.route("/api/sales/webhook", salesWebhookRoute);

// --- Facebook OAuth callback (browser redirect from Meta; signed-state auth) ---
app.route("/api/fb/oauth/callback", fbOauthCallbackRoute);

// --- Facebook Data Deletion Request Callback (machine caller; signed_request HMAC) ---
app.route("/api/fb/data-deletion", fbDataDeletionRoute);

// --- Public demo-lead capture (unauthenticated marketing form) ---------------
// Mounted on the public app BEFORE the authed api router. Writes to
// marketing_leads (an admin/read-only table via the generic API), so it needs
// its own validated endpoint instead of a client-side insert.
app.use("/api/public/*", rateLimit({ name: "public", windowMs: 60_000, max: 10 }));
app.post("/api/public/demo-lead", async (c) => {
  let body: Record<string, unknown> = {};
  try {
    const raw = await c.req.text();
    body = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
  } catch {
    return c.json({ error: { message: "Invalid JSON body" } }, 400);
  }

  const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
  const fullName = str(body.full_name);
  const email = str(body.email).toLowerCase();
  const whatsappNumber = str(body.whatsapp_number);
  const businessName = str(body.business_name);

  if (!fullName || fullName.length > 200) return c.json({ error: { message: "A valid name is required" } }, 400);
  if (!email || email.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return c.json({ error: { message: "A valid email is required" } }, 400);
  }
  if (!whatsappNumber || whatsappNumber.length > 30) {
    return c.json({ error: { message: "A valid WhatsApp number is required" } }, 400);
  }
  if (!businessName || businessName.length > 200) {
    return c.json({ error: { message: "A valid business name is required" } }, 400);
  }

  const now = new Date().toISOString();

  // Race-safe upsert: a single INSERT ... ON CONFLICT closes the
  // select-then-insert/update race that previously produced duplicate leads
  // under concurrent submissions for the same email. The unique index on
  // marketing_leads.email (added in migration 0008) is the conflict target.
  const leadId = crypto.randomUUID();
  await dbRun(
    `INSERT INTO marketing_leads
       (id, full_name, email, whatsapp_number, business_name, source, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (email) DO UPDATE
       SET full_name = EXCLUDED.full_name,
           whatsapp_number = EXCLUDED.whatsapp_number,
           business_name = EXCLUDED.business_name,
           updated_at = EXCLUDED.updated_at
       WHERE marketing_leads.status = 'new'`, // don't clobber a lead that progressed past 'new'
    leadId,
    fullName,
    email,
    whatsappNumber,
    businessName,
    "demo_request",
    "new",
    now,
    now,
  );
  // Re-fetch id (in case the conflict path took an existing row's id)
  const lead = (await dbGet(
    `SELECT id FROM marketing_leads WHERE email = ? LIMIT 1`,
    email,
  )) as { id: string } | undefined;
  const finalLeadId = lead?.id ?? leadId;

  // Auto-enroll into the value-first nurture funnel. No-ops if the campaign
  // isn't seeded or the lead is already enrolled. Best-effort: a funnel failure
  // must never fail the lead capture itself.
  try {
    await enrollLeadInFunnel(finalLeadId);
  } catch (err) {
    logger.error("funnel_enroll_failed", {
      msg_preview: err instanceof Error ? err.message : String(err),
    });
  }

  return c.json({ success: true });
});

app.post("/api/public/contact-form", async (c) => {
  let body: Record<string, unknown> = {};
  try {
    const raw = await c.req.text();
    body = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
  } catch {
    return c.json({ error: { message: "Invalid JSON body" } }, 400);
  }

  const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
  const name = str(body.name);
  const email = str(body.email).toLowerCase();
  const subject = str(body.subject) || "general";
  const message = str(body.message);

  if (!name || name.length > 200) return c.json({ error: { message: "A valid name is required" } }, 400);
  if (!email || email.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return c.json({ error: { message: "A valid email is required" } }, 400);
  }
  if (!message || message.length < 10 || message.length > 4000) {
    return c.json({ error: { message: "Message must be 10–4000 characters" } }, 400);
  }

  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  const safeSubject = subject.replace(/[\r\n]+/g, " ").slice(0, 120);

  await sendEmail({
    to: "support@ecomexautomation.com",
    subject: `[Contact] ${safeSubject} — ${name.replace(/[\r\n]+/g, " ").slice(0, 100)}`,
    html: `<p><strong>From:</strong> ${esc(name)} &lt;${esc(email)}&gt;</p><p><strong>Topic:</strong> ${esc(safeSubject)}</p><p>${esc(message).replace(/\n/g, "<br>")}</p>`,
  });

  return c.json({ success: true });
});

app.post("/api/public/newsletter-subscribe", async (c) => {
  let body: Record<string, unknown> = {};
  try {
    const raw = await c.req.text();
    body = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
  } catch {
    return c.json({ error: { message: "Invalid JSON body" } }, 400);
  }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email || email.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return c.json({ error: { message: "A valid email is required" } }, 400);
  }
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  // Fire-and-forget — don't surface email send failure to the visitor.
  sendEmail({
    to: "support@ecomexautomation.com",
    subject: "New newsletter subscriber",
    html: `<p>New subscriber: <strong>${esc(email)}</strong></p>`,
  }).catch(() => {});
  return c.json({ ok: true });
});

// --- authed API --------------------------------------------------------------
const api = new Hono();
api.use("*", tenantMiddleware);
// Per-user request cap (generous; dashboards fan out many reads on load). Abuse
// protection, not throttling normal use. Process-local — see lib/rate-limit.ts.
api.use(
  "*",
  rateLimit({
    name: "api",
    windowMs: 60_000,
    max: 600,
    keyFn: (c) => {
      try {
        return getTenant(c).userId;
      } catch {
        return "anon";
      }
    },
  }),
);
api.route("/query", queryRoute);
api.route("/rpc", rpcRoute);
api.route("/fn", fnRoute);
api.route("/media", mediaRoute);
api.route("/realtime", realtimeRoute);
// WebSocket realtime (primary transport; SSE /realtime stays as fallback).
// tenantMiddleware (api.use("*")) authenticates the upgrade via session cookie.
api.get("/ws", upgradeWebSocket(realtimeWsEvents));
api.route("/llm-settings", llmSettingsRoute);
api.route("/admin/billing", adminBillingRoute);
api.route("/fb/oauth/start", fbOauthStartRoute);
app.route("/api", api);

// --- static SPA in production ------------------------------------------------
if (IS_PRODUCTION && existsSync(WEB_DIST_DIR)) {
  const rootDir = path.relative(process.cwd(), WEB_DIST_DIR) || ".";
  app.use("/*", serveStatic({ root: rootDir }));

  // SPA fallback: serve index.html for non-file, non-api routes.
  // Cache the file content once at startup — readFileSync on every request
  // blocks the event loop, which compounds badly under 10k concurrent clients.
  const indexPath = path.join(WEB_DIST_DIR, "index.html");
  const indexHtml = existsSync(indexPath) ? readFileSync(indexPath, "utf8") : null;
  app.get("*", (c) => {
    if (indexHtml) return c.html(indexHtml);
    return c.text("Not found", 404);
  });
}

// Seed the pricing catalog if it's empty (migrations have already run via the
// entrypoint). Idempotent and cheap; unblocks checkout on a fresh DB. Wrapped so
// a DB-down boot still binds the port — /healthz then reports degraded instead of
// the process crashing before it can serve health.
try {
  await seedPlansIfEmpty();
} catch (err) {
  logger.error("seed_plans_failed", { msg_preview: err instanceof Error ? err.message : String(err) });
}

// Phase 2 — cross-instance realtime bridge. Fire-and-forget so a slow or
// unreachable Redis never delays app boot: the in-process event bus keeps
// working, and the bridge silently degrades to single-instance mode if it
// can't connect. See realtime/redis-pubsub.ts.
void initRedisBridge();

const server = serve({ fetch: app.fetch, port: PORT });

// Node.js 22 default keepAliveTimeout is 5 s but nginx's keepalive_timeout is
// 75 s. If nginx tries to reuse a connection the Node server already closed,
// it gets a TCP RST → nginx returns 502. Setting keepAliveTimeout above
// nginx's timeout prevents this race. headersTimeout must exceed it so a
// slow-starting request on a reused socket still gets time to send headers.
(server as import("node:http").Server).keepAliveTimeout = 90_000;
(server as import("node:http").Server).headersTimeout = 95_000;

// Attach the WebSocket upgrade handler to the Node http server.
injectWebSocket(server);

registerSoulJobs();
registerHermesPipeline();
registerCeoJobs();
registerGrowthJobs();
registerOptOutHandler();
registerBulkSend();

// Re-queue jobs stranded 'running' by a previous process crash before the
// scheduler starts claiming work, so orphaned jobs aren't lost.
void reapStuckJobs()
  .then((n) => {
    if (n > 0) logger.warn("reaped_stuck_jobs", { count: n });
  })
  .catch((err) => logger.error("reap_failed", { msg_preview: String(err) }));

startScheduler();

// Resource-pressure watchdog (RAM/disk → Telegram). The box runs near its
// memory ceiling; alert before it tips over.
void checkResourcePressure();
const resourceTimer = setInterval(() => void checkResourcePressure(), 60_000);
resourceTimer.unref();

warnIfWebhookUnverified();
warnIfTelegramWebhookUnverified();
void warnIfFbPagesUnverified();

let shuttingDown = false;
function shutdown(signal: string): void {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info("shutdown", { signal });
  stopScheduler();
  clearInterval(resourceTimer);
  // Stop accepting new connections. The callback fires once every tracked
  // connection (including WS/SSE) is fully closed and drained.
  server.close(() => {
    void closePool().finally(() => process.exit(0));
  });

  // Immediately close IDLE keep-alive connections (no request in flight).
  // Without this, nginx's persistent upstream conns hold server.close() open
  // indefinitely and the hard-kill fires before in-flight requests drain.
  (server as import("node:http").Server).closeIdleConnections();

  // After 5 s, force-close any remaining live connections: in-flight requests
  // that are taking too long, WebSocket sessions, and SSE streams. WS/SSE
  // clients reconnect on the next attempt, routing to the new instance.
  // This fires before the hard process.exit so server.close()'s callback still
  // has a chance to run and drain the DB pool cleanly.
  setTimeout(() => {
    (server as import("node:http").Server).closeAllConnections();
  }, 5_000).unref();

  // Hard kill after 10 s if pool drain stalls. Must be < stop_grace_period in
  // docker-compose.yml (15 s) so Docker does not SIGKILL before this runs.
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

export { app };
