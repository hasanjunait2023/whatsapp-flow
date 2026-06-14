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
import { llmSettingsRoute } from "./routes/llm-settings.js";
import { adminBillingRoute } from "./routes/admin-billing.js";
import { wahaWebhookRoute } from "./routes/waha/webhook.js";
import { telegramWebhookRoute } from "./routes/webhooks/telegram.js";
import { fbWebhookRoute, warnIfFbPagesUnverified } from "./routes/webhooks/fb.js";
import { fbOauthStartRoute, fbOauthCallbackRoute } from "./routes/fb-oauth.js";
import { woocommerceWebhookRoute } from "./routes/webhooks/woocommerce.js";
import { startScheduler, stopScheduler } from "./jobs/scheduler.js";
import { registerSoulJobs } from "./services/soul/index.js";
import { registerHermesPipeline } from "./services/hermes/pipeline.js";
import { registerCeoJobs } from "./services/ceo/index.js";
import { registerOptOutHandler } from "./services/opt-out.js";
import { registerBulkSend } from "./services/bulk-send.js";
import { seedPlansIfEmpty } from "./services/billing/seed-plans.js";
import {
  PORT,
  IS_PRODUCTION,
  WEB_DIST_DIR,
  warnIfWebhookUnverified,
  getMasterKey,
  WAHA_WEBHOOK_HMAC_ENFORCED,
} from "./lib/env.js";

// Fail fast at startup (production only) if the secret-encryption key is missing
// or malformed. Without this, MASTER_KEY is validated lazily on the first
// encryptSecret() call (e.g. a tenant saving an API key), surfacing as a
// confusing mid-request 500 instead of a clean boot failure.
if (IS_PRODUCTION) {
  getMasterKey();
  // Production runs WAHA Plus, which signs webhooks. Refuse to boot accepting
  // unauthenticated webhooks — a missing HMAC secret in prod is a hard error,
  // not a warning (an attacker who knows an instance id could inject events).
  if (!WAHA_WEBHOOK_HMAC_ENFORCED) {
    throw new Error(
      "WAHA webhook HMAC is not enforced in production. Set WAHA_WEBHOOK_HMAC_SECRET " +
        "(or WAHA_WEBHOOK_REQUIRE_HMAC=true) before starting.",
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
});

// --- global error handler ----------------------------------------------------
// Anything that throws out of a handler lands here: record it (DB + ops alert),
// log it, and return a generic 500 — never leak internal error text/stack.
app.onError((err, c) => {
  const requestId = (c.get("requestId") as string | undefined) ?? null;
  void captureError(err, {
    source: "backend",
    url: c.req.path,
    requestId,
    meta: { method: c.req.method },
  });
  logger.error("unhandled_error", {
    request_id: requestId ?? undefined,
    path: c.req.path,
    msg_preview: err instanceof Error ? err.message : String(err),
  });
  return c.json({ error: { message: "Internal server error" } }, 500);
});

// --- health ----------------------------------------------------------------
app.get("/healthz", async (c) => {
  let dbOk = false;
  try {
    await dbGet("SELECT 1");
    dbOk = true;
  } catch {
    dbOk = false;
  }
  const mem = process.memoryUsage();
  const body = {
    status: dbOk ? "ok" : "degraded",
    db: dbOk,
    rss: mem.rss,
    heapUsed: mem.heapUsed,
    uptime: process.uptime(),
  };
  return c.json(body, dbOk ? 200 : 503);
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

// --- Facebook OAuth callback (browser redirect from Meta; signed-state auth) ---
app.route("/api/fb/oauth/callback", fbOauthCallbackRoute);

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
  await dbRun(
    `INSERT INTO marketing_leads
       (id, full_name, email, whatsapp_number, business_name, source, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    crypto.randomUUID(),
    fullName,
    email,
    whatsappNumber,
    businessName,
    "demo_request",
    "new",
    now,
    now,
  );
  return c.json({ success: true });
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
  app.get("*", (c) => {
    const indexPath = path.join(WEB_DIST_DIR, "index.html");
    if (existsSync(indexPath)) {
      return c.html(readFileSync(indexPath, "utf8"));
    }
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

const server = serve({ fetch: app.fetch, port: PORT });
// Attach the WebSocket upgrade handler to the Node http server.
injectWebSocket(server);

registerSoulJobs();
registerHermesPipeline();
registerCeoJobs();
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
void warnIfFbPagesUnverified();

let shuttingDown = false;
function shutdown(signal: string): void {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info("shutdown", { signal });
  stopScheduler();
  clearInterval(resourceTimer);
  server.close(() => {
    // Drain the DB pool cleanly so in-flight queries finish and sockets close.
    void closePool().finally(() => process.exit(0));
  });
  // Force-exit if close/drain hangs.
  setTimeout(() => process.exit(1), 5000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

export { app };
