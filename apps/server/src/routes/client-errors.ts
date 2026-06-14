import { Hono } from "hono";
import { captureError } from "../lib/error-tracking.js";

/**
 * POST /api/client-errors — public (unauthenticated) sink for frontend crashes.
 * Unauthenticated on purpose so errors on the login/landing pages (before a
 * session exists) are still captured. Rate-limited at the mount point. The body
 * is untrusted: we cap field sizes and never echo it back.
 */
export const clientErrorsRoute = new Hono();

interface ClientErrorBody {
  message?: string;
  stack?: string;
  url?: string;
  userAgent?: string;
  componentStack?: string;
  severity?: "error" | "warn" | "fatal";
}

clientErrorsRoute.post("/", async (c) => {
  let body: ClientErrorBody = {};
  try {
    const raw = await c.req.text();
    body = raw ? (JSON.parse(raw) as ClientErrorBody) : {};
  } catch {
    return c.json({ success: false }, 400);
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message) return c.json({ success: false, error: "message required" }, 400);

  const err = new Error(message.slice(0, 2000));
  if (typeof body.stack === "string") err.stack = body.stack.slice(0, 8000);

  await captureError(err, {
    source: "frontend",
    severity: body.severity === "fatal" || body.severity === "warn" ? body.severity : "error",
    url: typeof body.url === "string" ? body.url.slice(0, 500) : null,
    meta: {
      userAgent: typeof body.userAgent === "string" ? body.userAgent.slice(0, 300) : undefined,
      componentStack:
        typeof body.componentStack === "string" ? body.componentStack.slice(0, 2000) : undefined,
    },
  });

  return c.json({ success: true });
});
