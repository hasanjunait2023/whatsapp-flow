import { runMigrations } from "../src/db/migrate.js";
import { db, sqlite } from "../src/db/index.js";
import { auth } from "../src/auth/index.js";
import {
  tenants,
  userRoles,
  profiles,
  contacts,
  messages,
  contactThreadState,
} from "../src/db/schema.js";

/**
 * Seeds a demo tenant + owner user + a few contacts and messages so the Phase 1
 * gate (login -> Contacts page loads real rows) can be verified end to end.
 *
 * Idempotent: clears the demo tenant's rows on each run.
 */

const DEMO_EMAIL = "owner@demo.test";
const DEMO_PASSWORD = "demo-password-123";
const DEMO_TENANT_ID = "00000000-0000-0000-0000-0000000000aa";

async function ensureUser(): Promise<string> {
  // Try sign-up; if the user already exists better-auth returns an error we ignore.
  try {
    const res = await auth.api.signUpEmail({
      body: { email: DEMO_EMAIL, password: DEMO_PASSWORD, name: "Demo Owner" },
    });
    if (res && "user" in res && res.user?.id) return res.user.id;
  } catch {
    // fall through to lookup
  }
  const row = sqlite
    .prepare("SELECT id FROM user WHERE email = ?")
    .get(DEMO_EMAIL) as { id: string } | undefined;
  if (!row) throw new Error("Failed to create or find demo user");
  return row.id;
}

async function main(): Promise<void> {
  runMigrations();

  const userId = await ensureUser();

  // Reset demo tenant data.
  sqlite.prepare("DELETE FROM messages WHERE tenant_id = ?").run(DEMO_TENANT_ID);
  sqlite
    .prepare("DELETE FROM contact_thread_state WHERE tenant_id = ?")
    .run(DEMO_TENANT_ID);
  sqlite.prepare("DELETE FROM contacts WHERE tenant_id = ?").run(DEMO_TENANT_ID);
  sqlite.prepare("DELETE FROM user_roles WHERE tenant_id = ?").run(DEMO_TENANT_ID);
  sqlite.prepare("DELETE FROM tenants WHERE id = ?").run(DEMO_TENANT_ID);

  const now = new Date().toISOString();

  db.insert(profiles)
    .values({ id: userId, email: DEMO_EMAIL, full_name: "Demo Owner" })
    .onConflictDoNothing()
    .run();

  db.insert(tenants)
    .values({
      id: DEMO_TENANT_ID,
      name: "Demo Tenant",
      slug: "demo-tenant",
      owner_id: userId,
      is_activated: true,
    })
    .run();

  db.insert(userRoles)
    .values({ tenant_id: DEMO_TENANT_ID, user_id: userId, role: "owner" })
    .run();

  const contactSeeds = [
    { name: "Alice Johnson", phone: "8801711000001", wa: "8801711000001@s.whatsapp.net" },
    { name: "Bob Rahman", phone: "8801711000002", wa: "8801711000002@s.whatsapp.net" },
    { name: "Carol Akter", phone: "8801711000003", wa: "8801711000003@s.whatsapp.net" },
  ];

  contactSeeds.forEach((seed, i) => {
    const contactId = crypto.randomUUID();
    const lastAt = new Date(Date.now() - i * 60_000).toISOString();
    db.insert(contacts)
      .values({
        id: contactId,
        tenant_id: DEMO_TENANT_ID,
        wa_id: seed.wa,
        phone_number: seed.phone,
        name: seed.name,
        last_message_at: lastAt,
        unread_count: i === 0 ? 2 : 0,
      })
      .run();

    db.insert(contactThreadState)
      .values({
        contact_id: contactId,
        tenant_id: DEMO_TENANT_ID,
        contact_name: seed.name,
        contact_phone: seed.phone,
        last_message_at: lastAt,
        last_message_preview: `Hello from ${seed.name}`,
        last_message_direction: "inbound",
        unread_count: i === 0 ? 2 : 0,
        total_messages: 2,
      })
      .run();

    db.insert(messages)
      .values([
        {
          tenant_id: DEMO_TENANT_ID,
          contact_id: contactId,
          direction: "inbound",
          content: `Hi, this is ${seed.name}`,
          content_type: "text",
          status: "delivered",
          wa_message_id: `wamid.${contactId}.in`,
          created_at: new Date(Date.parse(lastAt) - 30_000).toISOString(),
          sent_at: new Date(Date.parse(lastAt) - 30_000).toISOString(),
        },
        {
          tenant_id: DEMO_TENANT_ID,
          contact_id: contactId,
          direction: "outbound",
          content: "Thanks for reaching out!",
          content_type: "text",
          status: "sent",
          wa_message_id: `wamid.${contactId}.out`,
          created_at: lastAt,
          sent_at: lastAt,
        },
      ])
      .run();
  });

  void now;
  // eslint-disable-next-line no-console
  process.stdout.write(
    `Seeded demo tenant ${DEMO_TENANT_ID}\n` +
      `  login: ${DEMO_EMAIL} / ${DEMO_PASSWORD}\n` +
      `  contacts: ${contactSeeds.length}\n`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    process.stderr.write(`Seed failed: ${err?.message ?? err}\n`);
    process.exit(1);
  });
