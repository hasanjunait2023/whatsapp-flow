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

const { db, sqlite } = await import("../src/db/index.js");
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

function insertInbound(content: string, id = crypto.randomUUID()): string {
  db.insert(messages)
    .values({
      id,
      tenant_id: TENANT,
      contact_id: CONTACT,
      instance_id: INSTANCE,
      direction: "inbound",
      content,
      content_type: "text",
      wa_message_id: `wa-${id}`,
    })
    .run();
  return id;
}

function fire(messageId: string): void {
  fireInboundMessagePersisted({
    messageId,
    contactId: CONTACT,
    tenantId: TENANT,
    instanceId: INSTANCE,
    isNewContact: false,
    channel: "whatsapp",
  });
}

function queuedJobs(): Array<{ kind: string; status: string; payload: unknown }> {
  return db.select().from(jobQueue).all() as Array<{
    kind: string;
    status: string;
    payload: unknown;
  }>;
}

function resetContact(overrides: Record<string, unknown> = {}): void {
  db.delete(contacts).run();
  db.insert(contacts)
    .values({
      id: CONTACT,
      tenant_id: TENANT,
      instance_id: INSTANCE,
      wa_id: "123@s.whatsapp.net",
      phone_number: "123",
      ...overrides,
    })
    .run();
  db.delete(contactThreadState).run();
  db.insert(contactThreadState)
    .values({ contact_id: CONTACT, tenant_id: TENANT })
    .run();
}

beforeAll(() => {
  runMigrations();
  registerHermesPipeline();
  db.insert(tenants).values({ id: TENANT, name: "T", owner_id: "u" }).run();
});

beforeEach(() => {
  vi.clearAllMocks();
  db.delete(messages).run();
  db.delete(jobQueue).run();
  db.delete(agentConfigs).run();
  db.delete(notifications).run();
  resetContact();
  db.insert(agentConfigs)
    .values({ tenant_id: TENANT, agent: "hermes", enabled: true, reply_delay_ms: 0 })
    .run();
});

describe("hermes pipeline guards", () => {
  it("enqueues a reply job for an inbound message when enabled", () => {
    fire(insertInbound("hi"));
    const jobs = queuedJobs();
    expect(jobs).toHaveLength(1);
    expect(jobs[0].kind).toBe(HERMES_REPLY_JOB);
  });

  it("does nothing when the agent is disabled", () => {
    db.update(agentConfigs).set({ enabled: false }).run();
    fire(insertInbound("hi"));
    expect(queuedJobs()).toHaveLength(0);
  });

  it("does nothing when there is no config row", () => {
    db.delete(agentConfigs).run();
    fire(insertInbound("hi"));
    expect(queuedJobs()).toHaveLength(0);
  });

  it("suppresses the agent when the contact is in handoff", () => {
    resetContact({ needs_handoff: true });
    fire(insertInbound("hi"));
    expect(queuedJobs()).toHaveLength(0);
  });

  it("suppresses the agent when a human is actively replying", () => {
    resetContact({ replying_user_id: "human-1" });
    fire(insertInbound("hi"));
    expect(queuedJobs()).toHaveLength(0);
  });

  it("suppresses the agent for blocked or archived contacts", () => {
    resetContact({ is_blocked: true });
    fire(insertInbound("hi"));
    expect(queuedJobs()).toHaveLength(0);
  });

  it("coalesces a burst of messages into one job (debounce)", () => {
    fire(insertInbound("part 1"));
    fire(insertInbound("part 2"));
    fire(insertInbound("part 3"));
    expect(queuedJobs()).toHaveLength(1);
  });

  it("escalation keyword bypasses the LLM and hands off immediately", () => {
    db.update(agentConfigs)
      .set({ escalation_keywords: ["refund", "manager"] })
      .run();
    fire(insertInbound("I want a REFUND now"));
    expect(queuedJobs()).toHaveLength(0); // no LLM job
    const contact = db.select().from(contacts).all()[0];
    expect(contact.needs_handoff).toBe(true);
    expect(db.select().from(notifications).all()).toHaveLength(1);
  });
});

describe("hermes reply job", () => {
  it("runs the agent and sends the reply flagged is_from_ai", async () => {
    const sentRowId = "sent-msg-1";
    // The mocked sendMessage doesn't insert; create the row it reports.
    db.insert(messages)
      .values({
        id: sentRowId,
        tenant_id: TENANT,
        contact_id: CONTACT,
        direction: "outbound",
        content: "Hello! How can I help?",
        content_type: "text",
        sent_by_user_id: "should-be-cleared",
      })
      .run();

    fire(insertInbound("what are your hours?"));
    await processDueJobs();

    expect(runHermesAgent).toHaveBeenCalledOnce();
    expect(sendMessage).toHaveBeenCalledOnce();
    const sent = sqlite
      .prepare("SELECT is_from_ai, sent_by_user_id FROM messages WHERE id = ?")
      .get(sentRowId) as { is_from_ai: number; sent_by_user_id: string | null };
    expect(sent.is_from_ai).toBe(1);
    expect(sent.sent_by_user_id).toBeNull();
  });

  it("skips when a human replied during the debounce window", async () => {
    fire(insertInbound("question"));
    // Human reply lands after the inbound, before the job runs.
    db.insert(messages)
      .values({
        tenant_id: TENANT,
        contact_id: CONTACT,
        direction: "outbound",
        content: "human answer",
        content_type: "text",
        created_at: new Date(Date.now() + 1000).toISOString(),
      })
      .run();
    await processDueJobs();
    expect(runHermesAgent).not.toHaveBeenCalled();
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it("skips when the contact entered handoff during the debounce window", async () => {
    fire(insertInbound("question"));
    db.update(contacts).set({ needs_handoff: true }).run();
    await processDueJobs();
    expect(runHermesAgent).not.toHaveBeenCalled();
  });

  it("applies handoff when the agent decides to escalate", async () => {
    vi.mocked(runHermesAgent).mockResolvedValueOnce({
      kind: "handoff",
      handoffReason: "Customer is angry",
      runId: "run-2",
    });
    fire(insertInbound("this is unacceptable"));
    await processDueJobs();

    expect(sendMessage).not.toHaveBeenCalled();
    const contact = db.select().from(contacts).all()[0];
    expect(contact.needs_handoff).toBe(true);
    expect(contact.handoff_reason).toBe("Customer is angry");
    const thread = db.select().from(contactThreadState).all()[0];
    expect(thread.needs_handoff).toBe(true);
  });
});

describe("applyHandoff", () => {
  it("mirrors handoff state to contact, thread state, and notifications", () => {
    applyHandoff(TENANT, CONTACT, "test reason");
    expect(db.select().from(contacts).all()[0].needs_handoff).toBe(true);
    expect(db.select().from(contactThreadState).all()[0].handoff_reason).toBe("test reason");
    const notif = db.select().from(notifications).all()[0];
    expect(notif.type).toBe("ai_handoff");
  });
});
