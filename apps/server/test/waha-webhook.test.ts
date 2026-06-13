import { describe, it, expect, beforeAll } from "vitest";
import { Hono } from "hono";
import { useTempDb } from "./helpers.js";

useTempDb();

const { db } = await import("../src/db/index.js");
const { dbGet } = await import("../src/db/raw.js");
const { runMigrations } = await import("../src/db/migrate.js");
const { wahaWebhookRoute } = await import("../src/routes/waha/webhook.js");
const { tenants, whatsappInstances } = await import("../src/db/schema.js");

const TENANT = "tttt1111-1111-1111-1111-111111111111";
const INSTANCE = "iiii2222-2222-2222-2222-222222222222";

const app = new Hono();
app.route("/webhook", wahaWebhookRoute);

function post(instanceId: string, body: unknown) {
  return app.request(`/webhook/${instanceId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function inboundPayload(id: string, body: string) {
  return {
    event: "message",
    session: "default",
    payload: {
      id,
      timestamp: 1700000000,
      from: "15551234567@c.us",
      to: "00000@c.us",
      fromMe: false,
      body,
      hasMedia: false,
    },
  };
}

beforeAll(async () => {
  await runMigrations();
  await db.insert(tenants).values({ id: TENANT, name: "T", owner_id: "u" });
  await db
    .insert(whatsappInstances)
    .values({ id: INSTANCE, tenant_id: TENANT, name: "WA", status: "active", session_id: "default" });
});

describe("WAHA webhook ingest", () => {
  it("404s for an unknown instance", async () => {
    const res = await post("nope", inboundPayload("x", "hi"));
    expect(res.status).toBe(404);
  });

  it("ingests an inbound message: contact + message + thread-state rows", async () => {
    const res = await post(INSTANCE, inboundPayload("wamid-1", "hello"));
    expect(res.status).toBe(200);

    const contact = (await dbGet(
      "SELECT id, unread_count, phone_number FROM contacts WHERE instance_id = ?",
      INSTANCE,
    )) as { id: string; unread_count: number; phone_number: string };
    expect(contact.phone_number).toBe("15551234567");
    expect(contact.unread_count).toBe(1);

    const message = (await dbGet(
      "SELECT direction, status, content FROM messages WHERE wa_message_id = ?",
      "wamid-1",
    )) as { direction: string; status: string; content: string };
    expect(message.direction).toBe("inbound");
    expect(message.status).toBe("delivered");
    expect(message.content).toBe("hello");

    const thread = (await dbGet(
      "SELECT unread_count, total_messages, last_message_direction FROM contact_thread_state WHERE contact_id = ?",
      contact.id,
    )) as { unread_count: number; total_messages: number; last_message_direction: string };
    expect(thread.unread_count).toBe(1);
    expect(thread.total_messages).toBe(1);
    expect(thread.last_message_direction).toBe("inbound");

    const stats = (await dbGet(
      "SELECT inbound_count, wa_inbound, new_conversations FROM tenant_daily_stats WHERE tenant_id = ?",
      TENANT,
    )) as { inbound_count: number; wa_inbound: number; new_conversations: number };
    expect(stats.inbound_count).toBe(1);
    expect(stats.wa_inbound).toBe(1);
    expect(stats.new_conversations).toBe(1);

    const usage = (await dbGet(
      "SELECT messages_received FROM usage_counters WHERE tenant_id = ?",
      TENANT,
    )) as { messages_received: number };
    expect(usage.messages_received).toBe(1);
  });

  it("is idempotent: the same wa_message_id twice yields one message row", async () => {
    await post(INSTANCE, inboundPayload("wamid-dup", "once"));
    await post(INSTANCE, inboundPayload("wamid-dup", "once"));
    const count = (await dbGet(
      "SELECT COUNT(*)::int AS n FROM messages WHERE wa_message_id = ?",
      "wamid-dup",
    )) as { n: number };
    expect(count.n).toBe(1);
  });

  it("transitions message status via message.ack (sent → delivered → read)", async () => {
    await post(INSTANCE, inboundPayload("wamid-ack", "ack me"));

    async function ack(value: number) {
      return post(INSTANCE, {
        event: "message.ack",
        session: "default",
        payload: { id: "wamid-ack", ack: value },
      });
    }

    await ack(2);
    expect(
      ((await dbGet("SELECT status FROM messages WHERE wa_message_id = ?", "wamid-ack")) as { status: string })
        .status,
    ).toBe("sent");

    await ack(3);
    const delivered = (await dbGet(
      "SELECT status, delivered_at FROM messages WHERE wa_message_id = ?",
      "wamid-ack",
    )) as { status: string; delivered_at: string | null };
    expect(delivered.status).toBe("delivered");
    expect(delivered.delivered_at).not.toBeNull();

    await ack(4);
    const read = (await dbGet(
      "SELECT status, read_at FROM messages WHERE wa_message_id = ?",
      "wamid-ack",
    )) as { status: string; read_at: string | null };
    expect(read.status).toBe("read");
    expect(read.read_at).not.toBeNull();
  });

  it("updates whatsapp_instances status on session.status WORKING", async () => {
    await post(INSTANCE, {
      event: "session.status",
      session: "default",
      payload: { name: "default", status: "FAILED" },
    });
    expect(
      ((await dbGet("SELECT status FROM whatsapp_instances WHERE id = ?", INSTANCE)) as { status: string })
        .status,
    ).toBe("disconnected");

    await post(INSTANCE, {
      event: "session.status",
      session: "default",
      payload: { name: "default", status: "WORKING", me: { id: "15559999999@c.us" } },
    });
    const inst = (await dbGet(
      "SELECT status, phone_number, qr_code FROM whatsapp_instances WHERE id = ?",
      INSTANCE,
    )) as { status: string; phone_number: string | null; qr_code: string | null };
    expect(inst.status).toBe("active");
    expect(inst.phone_number).toBe("15559999999");
    expect(inst.qr_code).toBeNull();
  });

  it("records every event in webhook_events_log", async () => {
    const count = (await dbGet(
      "SELECT COUNT(*)::int AS n FROM webhook_events_log WHERE instance_id = ?",
      INSTANCE,
    )) as { n: number };
    expect(count.n).toBeGreaterThan(0);
  });
});
