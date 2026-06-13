import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { dbGet } from "./db/raw.js";
import { auth } from "./auth/index.js";
import { tenantMiddleware } from "./middleware/tenant.js";
import { queryRoute } from "./routes/query.js";
import { rpcRoute } from "./routes/rpc.js";
import { fnRoute } from "./routes/fn.js";
import { mediaRoute } from "./routes/media.js";
import { realtimeRoute } from "./realtime/sse.js";
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
import { seedPlansIfEmpty } from "./services/billing/seed-plans.js";
import { PORT, IS_PRODUCTION, WEB_DIST_DIR, warnIfWebhookUnverified, getMasterKey } from "./lib/env.js";

// Fail fast at startup (production only) if the secret-encryption key is missing
// or malformed. Without this, MASTER_KEY is validated lazily on the first
// encryptSecret() call (e.g. a tenant saving an API key), surfacing as a
// confusing mid-request 500 instead of a clean boot failure.
if (IS_PRODUCTION) {
  getMasterKey();
}

const app = new Hono();

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
app.on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw));

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

// --- authed API --------------------------------------------------------------
const api = new Hono();
api.use("*", tenantMiddleware);
api.route("/query", queryRoute);
api.route("/rpc", rpcRoute);
api.route("/fn", fnRoute);
api.route("/media", mediaRoute);
api.route("/realtime", realtimeRoute);
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
// entrypoint). Idempotent and cheap; unblocks checkout on a fresh DB.
await seedPlansIfEmpty();

const server = serve({ fetch: app.fetch, port: PORT });

registerSoulJobs();
registerHermesPipeline();
registerCeoJobs();
startScheduler();
warnIfWebhookUnverified();
void warnIfFbPagesUnverified();

function shutdown(signal: string): void {
  stopScheduler();
  server.close(() => {
    // The pg Pool's sockets are released on process exit; nothing to close here.
    process.exit(0);
  });
  // Force-exit if close hangs.
  setTimeout(() => process.exit(1), 5000).unref();
  void signal;
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

export { app };
