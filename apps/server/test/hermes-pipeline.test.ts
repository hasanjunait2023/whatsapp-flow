import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import { useTempDb } from "./helpers.js";

useTempDb();

// Mock the agent (no LLM) and outbound send (no WAHA).
vi.mock("../src/services/hermes/agent.js", () => ({
  runHermesAgent: vi.fn(async () => ({
    kind: "reply",
    reply: "Hello! How can I help?",
    runId: "run-1",
  })),
}));
vi.mock("../src/routes/messaging.js", () => ({
  sendMessage: vi.fn(async () => ({
    data: { success: true, message_id: "sent-msg-1" },
    error: null,
  })),
}));

const { db } = await import("../src/db/index.js");
const { dbGet } = await import("../src/db/raw.js");
const { runMigrations } = await import("../src/db/migrate.js");
const { tenants, contacts, contactThreadState, messages, agentConfigs, jobQueue, notifications } =
  await import("../src/db/schema.js");
const { processDueJobs } = await import("../src/jobs/queue.js");
const { registerHermesPipeline, applyHandoff, HERMES_REPLY_JOB } = await import(
  "../src/services/hermes/pipeline.js"
);
const { fireInboundMessagePersisted } = await import("../src/services/inbound-hooks.js");
const { runHermesAgent } = await import("../src/services/hermes/agent.js");
const { sendMessage } = await import("../src/routes/messaging.js");

const TENANT = "tttt1111-1111-1111-1111-111111111111";
const CONTACT = "cccc1111-1111-1111-1111-111111111111";
const INSTANCE = "iiii1111-1111-1111-1111-111111111111";

async function insertInbound(content: string, id = crypto.randomUUID()): Promise<string> {
  await db.insert(messages).values({
    id,
    tenant_id: TENANT,
    contact_id: CONTACT,
    instance_id: INSTANCE,
    direction: "inbound",
    content,
    content_type: "text",
    wa_message_id: `wa-${id}`,
  });
  return id;
}

/**
 * The inbound hook is fire-and-forget: fireInboundMessagePersisted() returns
 * void and the async handler (a chain of awaited PGlite queries ending in a
 * job INSERT/dedupe) runs as a detached promise. A fixed tick count is not a
 * deterministic settle signal, so instead we drain immediates until the
 * job_queue row count stops changing across two consecutive drains. PGlite is
 * in-process, so once the count is stable the handler has reached its terminal
 * DB write. Crucially, this lets one hook's INSERT commit before the next
 * fire() runs its dedupe SELECT — which is what makes a burst coalesce into
 * exactly one job.
 */
async function drainImmediates(times: number): Promise<void> {
  for (let i = 0; i < times; i++) {
    await new Promise((resolve) => setImmediate(resolve));
  }
}

async function jobCount(): Promise<number> {
  return (await db.select().from(jobQueue)).length;
}

async function flushHooks(): Promise<void> {
  // Guaranteed baseline drain so even a hook that ends with NO job write (the
  // guard/escalation paths) has fully run its query chain before we sample —
  // this is what stops a late job from leaking into the next test.
  await drainImmediates(50);
  let prev = await jobCount();
  let stableRounds = 0;
  // Then confirm the count is stable twice in a row; terminates early.
  for (let round = 0; round < 50 && stableRounds < 2; round++) {
    await drainImmediates(10);
    const count = await jobCount();
    stableRounds = count === prev ? stableRounds + 1 : 0;
    prev = count;
  }
}

async function fire(messageId: string): Promise<void> {
  fireInboundMessagePersisted({
    messageId,
    contactId: CONTACT,
    tenantId: TENANT,
    instanceId: INSTANCE,
    isNewContact: false,
    channel: "whatsapp",
  });
  await flushHooks();
}

async function queuedJobs(): Promise<Array<{ kind: string; status: string; payload: unknown }>> {
  return (await db.select().from(jobQueue)) as Array<{
    kind: string;
    status: string;
    payload: unknown;
  }>;
}

async function resetContact(overrides: Record<string, unknown> = {}): Promise<void> {
  await db.delete(contacts);
  await db.insert(contacts).values({
    id: CONTACT,
    tenant_id: TENANT,
    instance_id: INSTANCE,
    wa_id: "123@s.whatsapp.net",
    phone_number: "123",
    ...overrides,
  });
  await db.delete(contactThreadState);
  await db.insert(contactThreadState).values({ contact_id: CONTACT, tenant_id: TENANT });
}

beforeAll(async () => {
  await runMigrations();
  registerHermesPipeline();
  await db.insert(tenants).values({ id: TENANT, name: "T", owner_id: "u" });
});

beforeEach(async () => {
  vi.clearAllMocks();
  await db.delete(messages);
  await db.delete(jobQueue);
  await db.delete(agentConfigs);
  await db.delete(notifications);
  await resetContact();
  await db.insert(agentConfigs).values({ tenant_id: TENANT, agent: "hermes", enabled: true, reply_delay_ms: 0 });
});

describe("hermes pipeline guards", () => {
  it("enqueues a reply job for an inbound message when enabled", async () => {
    await fire(await insertInbound("hi"));
    const jobs = await queuedJobs();
    expect(jobs).toHaveLength(1);
    expect(jobs[0].kind).toBe(HERMES_REPLY_JOB);
  });

  it("does nothing when the agent is disabled", async () => {
    await db.update(agentConfigs).set({ enabled: false });
    await fire(await insertInbound("hi"));
    expect(await queuedJobs()).toHaveLength(0);
  });

  it("does nothing when there is no config row", async () => {
    await db.delete(agentConfigs);
    await fire(await insertInbound("hi"));
    expect(await queuedJobs()).toHaveLength(0);
  });

  it("suppresses the agent when the contact is in handoff", async () => {
    await resetContact({ needs_handoff: true });
    await fire(await insertInbound("hi"));
    expect(await queuedJobs()).toHaveLength(0);
  });

  it("suppresses the agent when a human is actively replying", async () => {
    await resetContact({ replying_user_id: "human-1" });
    await fire(await insertInbound("hi"));
    expect(await queuedJobs()).toHaveLength(0);
  });

  it("suppresses the agent for blocked or archived contacts", async () => {
    await resetContact({ is_blocked: true });
    await fire(await insertInbound("hi"));
    expect(await queuedJobs()).toHaveLength(0);
  });

  it("coalesces a burst of messages into one job (debounce)", async () => {
    await fire(await insertInbound("part 1"));
    await fire(await insertInbound("part 2"));
    await fire(await insertInbound("part 3"));
    expect(await queuedJobs()).toHaveLength(1);
  });

  it("escalation keyword bypasses the LLM and hands off immediately", async () => {
    await db.update(agentConfigs).set({ escalation_keywords: ["refund", "manager"] });
    await fire(await insertInbound("I want a REFUND now"));
    expect(await queuedJobs()).toHaveLength(0); // no LLM job
    const contact = (await db.select().from(contacts))[0];
    expect(contact.needs_handoff).toBe(true);
    expect(await db.select().from(notifications)).toHaveLength(1);
  });
});

describe("hermes reply job", () => {
  it("runs the agent and sends the reply flagged is_from_ai", async () => {
    const sentRowId = "sent-msg-1";
    // The mocked sendMessage doesn't insert; create the row it reports.
    await db.insert(messages).values({
      id: sentRowId,
      tenant_id: TENANT,
      contact_id: CONTACT,
      direction: "outbound",
      content: "Hello! How can I help?",
      content_type: "text",
      sent_by_user_id: "should-be-cleared",
    });

    await fire(await insertInbound("what are your hours?"));
    await processDueJobs();

    expect(runHermesAgent).toHaveBeenCalledOnce();
    expect(sendMessage).toHaveBeenCalledOnce();
    const sent = (await dbGet("SELECT is_from_ai, sent_by_user_id FROM messages WHERE id = ?", sentRowId)) as {
      is_from_ai: boolean;
      sent_by_user_id: string | null;
    };
    expect(sent.is_from_ai).toBe(true);
    expect(sent.sent_by_user_id).toBeNull();
  });

  it("skips when a human replied during the debounce window", async () => {
    await fire(await insertInbound("question"));
    // Human reply lands after the inbound, before the job runs.
    await db.insert(messages).values({
      tenant_id: TENANT,
      contact_id: CONTACT,
      direction: "outbound",
      content: "human answer",
      content_type: "text",
      created_at: new Date(Date.now() + 1000).toISOString(),
    });
    await processDueJobs();
    expect(runHermesAgent).not.toHaveBeenCalled();
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it("skips when the contact entered handoff during the debounce window", async () => {
    await fire(await insertInbound("question"));
    await db.update(contacts).set({ needs_handoff: true });
    await processDueJobs();
    expect(runHermesAgent).not.toHaveBeenCalled();
  });

  it("applies handoff when the agent decides to escalate", async () => {
    vi.mocked(runHermesAgent).mockResolvedValueOnce({
      kind: "handoff",
      handoffReason: "Customer is angry",
      runId: "run-2",
    });
    await fire(await insertInbound("this is unacceptable"));
    await processDueJobs();

    expect(sendMessage).not.toHaveBeenCalled();
    const contact = (await db.select().from(contacts))[0];
    expect(contact.needs_handoff).toBe(true);
    expect(contact.handoff_reason).toBe("Customer is angry");
    const thread = (await db.select().from(contactThreadState))[0];
    expect(thread.needs_handoff).toBe(true);
  });
});

describe("applyHandoff", () => {
  it("mirrors handoff state to contact, thread state, and notifications", async () => {
    await applyHandoff(TENANT, CONTACT, "test reason");
    expect((await db.select().from(contacts))[0].needs_handoff).toBe(true);
    expect((await db.select().from(contactThreadState))[0].handoff_reason).toBe("test reason");
    const notif = (await db.select().from(notifications))[0];
    expect(notif.type).toBe("ai_handoff");
  });
});
