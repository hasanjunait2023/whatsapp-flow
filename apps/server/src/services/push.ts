import { sqlite } from "../db/index.js";

/**
 * Web push fan-out. "web-push" is dynamic-imported: when the module or VAPID
 * keys are absent, sends silently no-op (in-app + SSE notification paths still
 * run), so push is an enhancement, never a dependency.
 */

interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

interface SubscriptionRow {
  id: string;
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

let webPushModule: typeof import("web-push") | null | undefined;

async function getWebPush(): Promise<typeof import("web-push") | null> {
  if (webPushModule !== undefined) return webPushModule;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:admin@example.com";
  if (!publicKey || !privateKey) {
    webPushModule = null;
    return null;
  }
  try {
    const mod = await import("web-push");
    mod.setVapidDetails(subject, publicKey, privateKey);
    webPushModule = mod;
  } catch {
    webPushModule = null; // package not installed yet
  }
  return webPushModule;
}

export function saveSubscription(
  tenantId: string,
  userId: string,
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  userAgent?: string,
): void {
  sqlite
    .prepare(
      `INSERT INTO push_subscriptions (id, tenant_id, user_id, endpoint, keys, user_agent)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT (endpoint) DO UPDATE SET tenant_id = excluded.tenant_id,
         user_id = excluded.user_id, keys = excluded.keys, user_agent = excluded.user_agent`,
    )
    .run(
      crypto.randomUUID(),
      tenantId,
      userId,
      subscription.endpoint,
      JSON.stringify(subscription.keys),
      userAgent ?? null,
    );
}

/**
 * Removes a push subscription by endpoint. When `owner` is supplied (user-facing
 * unsubscribe), the delete is scoped to that tenant+user so a caller cannot
 * remove another tenant's endpoint. The unscoped form is for internal pruning
 * of endpoints the push service itself reported as gone (404/410) — a dead
 * endpoint is globally dead, so no owner check applies.
 */
export function removeSubscription(
  endpoint: string,
  owner?: { tenantId: string; userId: string },
): void {
  if (owner) {
    sqlite
      .prepare(
        `DELETE FROM push_subscriptions WHERE endpoint = ? AND tenant_id = ? AND user_id = ?`,
      )
      .run(endpoint, owner.tenantId, owner.userId);
    return;
  }
  sqlite.prepare(`DELETE FROM push_subscriptions WHERE endpoint = ?`).run(endpoint);
}

async function sendToRows(rows: SubscriptionRow[], payload: PushPayload): Promise<void> {
  const webPush = await getWebPush();
  if (!webPush || rows.length === 0) return;
  const body = JSON.stringify(payload);
  await Promise.all(
    rows.map(async (row) => {
      try {
        await webPush.sendNotification({ endpoint: row.endpoint, keys: row.keys }, body);
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          removeSubscription(row.endpoint); // endpoint gone — prune
        }
      }
    }),
  );
}

function parseRows(raw: Array<{ id: string; endpoint: string; keys: string }>): SubscriptionRow[] {
  return raw.flatMap((r) => {
    try {
      return [{ id: r.id, endpoint: r.endpoint, keys: JSON.parse(r.keys) }];
    } catch {
      return [];
    }
  });
}

export async function sendPushToUser(
  tenantId: string,
  userId: string,
  payload: PushPayload,
): Promise<void> {
  const rows = sqlite
    .prepare(
      `SELECT id, endpoint, keys FROM push_subscriptions WHERE tenant_id = ? AND user_id = ?`,
    )
    .all(tenantId, userId) as Array<{ id: string; endpoint: string; keys: string }>;
  await sendToRows(parseRows(rows), payload);
}

export async function sendPushToTenant(tenantId: string, payload: PushPayload): Promise<void> {
  const rows = sqlite
    .prepare(`SELECT id, endpoint, keys FROM push_subscriptions WHERE tenant_id = ?`)
    .all(tenantId) as Array<{ id: string; endpoint: string; keys: string }>;
  await sendToRows(parseRows(rows), payload);
}
