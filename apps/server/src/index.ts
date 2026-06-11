import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { sqlite } from "./db/index.js";
import { auth } from "./auth/index.js";
import { tenantMiddleware } from "./middleware/tenant.js";
import { queryRoute } from "./routes/query.js";
import { rpcRoute } from "./routes/rpc.js";
import { fnRoute } from "./routes/fn.js";
import { mediaRoute } from "./routes/media.js";
import { realtimeRoute } from "./realtime/sse.js";
import { PORT, IS_PRODUCTION, WEB_DIST_DIR } from "./lib/env.js";

const app = new Hono();

// --- health ----------------------------------------------------------------
app.get("/healthz", (c) => {
  let dbOk = false;
  try {
    sqlite.prepare("SELECT 1").get();
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

// --- authed API --------------------------------------------------------------
const api = new Hono();
api.use("*", tenantMiddleware);
api.route("/query", queryRoute);
api.route("/rpc", rpcRoute);
api.route("/fn", fnRoute);
api.route("/media", mediaRoute);
api.route("/realtime", realtimeRoute);
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

const server = serve({ fetch: app.fetch, port: PORT });

function shutdown(signal: string): void {
  server.close(() => {
    try {
      sqlite.close();
    } catch {
      // already closed
    }
    process.exit(0);
  });
  // Force-exit if close hangs.
  setTimeout(() => process.exit(1), 5000).unref();
  void signal;
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

export { app };
