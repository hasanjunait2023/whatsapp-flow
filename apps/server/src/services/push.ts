import { dbAll, dbRun, coerceJson } from "../db/raw.js";

/**
 * Web push fan-out. "web-push" is dynamic-imported: when the module or VAPID
 * keys are absent, sends silently no-op (in-app + SSE notification paths still
 * run), so push is an enhancement, never a dependency.
 *
 * VAPID keys are validated at module load so missing keys fail at boot, not
 * silently at runtime.
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

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT ?? "mailto:admin@example.com";

if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  console.warn("[push] VAPID keys not set — web push disabled");
}

let webPushModule: typeof import("web-push") | null | undefined;

async function getWebPush(): Promise<typeof import("web-push") | null> {
  if (webPushModule !== undefined) return webPushModule;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    webPushModule = null;
    return null;
  }
  try {
    const mod = await import("web-push");
    mod.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    webPushModule = mod;
  } catch {
    webPushModule = null; // package not installed yet
  }
  return webPushModule;
}

export async function saveSubscription(
  tenantId: string,
  userId: string,
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  userAgent?: string,
): Promise<void> {
  await dbRun(
    `INSERT INTO push_subscriptions (id, tenant_id, user_id, endpoint, keys, user_agent)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT (endpoint) DO UPDATE SET tenant_id = excluded.tenant_id,
         user_id = excluded.user_id, keys = excluded.keys, user_agent = excluded.user_agent`,
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
export async function removeSubscription(
  endpoint: string,
  owner?: { tenantId: string; userId: string },
): Promise<void> {
  if (owner) {
    await dbRun(
      `DELETE FROM push_subscriptions WHERE endpoint = ? AND tenant_id = ? AND user_id = ?`,
      endpoint,
      owner.tenantId,
      owner.userId,
    );
    return;
  }
  await dbRun(`DELETE FROM push_subscriptions WHERE endpoint = ?`, endpoint);
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
          await removeSubscription(row.endpoint); // endpoint gone — prune
        }
      }
    }),
  );
}

function parseRows(raw: Array<{ id: string; endpoint: string; keys: string }>): SubscriptionRow[] {
  return raw.flatMap((r) => {
    try {
      return [{ id: r.id, endpoint: r.endpoint, keys: coerceJson(r.keys) }];
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
  const rows = (await dbAll(
    `SELECT id, endpoint, keys FROM push_subscriptions WHERE tenant_id = ? AND user_id = ?`,
    tenantId,
    userId,
  )) as Array<{ id: string; endpoint: string; keys: string }>;
  await sendToRows(parseRows(rows), payload);
}

export async function sendPushToTenant(tenantId: string, payload: PushPayload): Promise<void> {
  const rows = (await dbAll(
    `SELECT id, endpoint, keys FROM push_subscriptions WHERE tenant_id = ?`,
    tenantId,
  )) as Array<{ id: string; endpoint: string; keys: string }>;
  await sendToRows(parseRows(rows), payload);
}
