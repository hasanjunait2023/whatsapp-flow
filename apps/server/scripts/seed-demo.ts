import { runMigrations } from "../src/db/migrate.js";
import { db } from "../src/db/index.js";
import { dbGet, dbRun } from "../src/db/raw.js";
import { auth } from "../src/auth/index.js";
import {
  tenants,
  profiles,
  userRoles,
  subscriptions,
  payments,
  whatsappInstances,
  facebookPages,
  contacts,
  messages,
  contactThreadState,
  products,
  categories,
  orders,
  orderItems,
  notifications,
  customerSegments,
  contactSegments,
  whatsappGroups,
  whatsappGroupParticipants,
  workflows,
  automationRules,
  whatsappAutoMessages,
  complaints,
  serviceBoards,
  serviceLists,
  serviceCards,
  internalChatRooms,
  internalChatMembers,
  internalMessages,
  tenantExpenseCategories,
  tenantExpenses,
  tenantRecurringExpenses,
  teamMemberPermissions,
  inAppNotifications,
  reminderSettings,
  marketingLeads,
  adminMarketingCampaigns,
  adminMarketingSequences,
  adminMarketingEnrollments,
  adminMarketingSends,
  adminTasks,
  adminNotifications,
  adminCustomerJourney,
  stockMovements,
} from "../src/db/schema.js";

/**
 * DEMO seed — populates a realistic multi-tenant dataset so every admin + tenant
 * page renders with believable content for a visual-QA pass.
 *
 * Idempotent: every delete is scoped to the demo tenant ids / demo emails this
 * script owns. The pre-existing founder user, the 4 plans, and any tenant id not
 * created here are NEVER touched.
 *
 * Run: `tsx scripts/seed-demo.ts` (or `npm run seed:demo` from apps/server).
 */

// --- Owned ids / creds -----------------------------------------------------
const RICH_TENANT_ID = "00000000-0000-0000-0000-0000000000aa";
const OWNER_EMAIL = "owner@demo.test";
const OWNER_PASSWORD = "demo-password-123";

// Extra demo tenant ids (deterministic so deletes are scoped + re-runs stable).
const DEMO_TENANT_IDS = [
  "00000000-0000-0000-0000-0000000000b1",
  "00000000-0000-0000-0000-0000000000b2",
  "00000000-0000-0000-0000-0000000000b3",
  "00000000-0000-0000-0000-0000000000b4",
];
const ALL_TENANT_IDS = [RICH_TENANT_ID, ...DEMO_TENANT_IDS];

// Team members for the rich tenant (created via better-auth, deleted by email).
const TEAM = [
  { email: "manager@demo.test", name: "Nadia Karim", role: "manager" },
  { email: "staff1@demo.test", name: "Tanvir Hasan", role: "agent" },
  { email: "staff2@demo.test", name: "Sumaiya Islam", role: "agent" },
];
const TEAM_EMAILS = TEAM.map((m) => m.email);

// --- Time helpers ----------------------------------------------------------
const DAY = 86_400_000;
const iso = (msAgo: number): string => new Date(Date.now() - msAgo).toISOString();
const isoDate = (msAgo: number): string =>
  new Date(Date.now() - msAgo).toISOString().slice(0, 10);
const PLAN_IDS = ["starter", "pro", "business", "enterprise"] as const;

function pick<T>(arr: readonly T[], i: number): T {
  return arr[i % arr.length];
}

// --- Auth user create-or-find ----------------------------------------------
async function ensureUser(email: string, password: string, name: string): Promise<string> {
  try {
    const res = await auth.api.signUpEmail({ body: { email, password, name } });
    if (res && "user" in res && res.user?.id) return res.user.id;
  } catch {
    /* fall through to lookup */
  }
  const row = (await dbGet('SELECT id FROM "user" WHERE email = ?', email)) as
    | { id: string }
    | undefined;
  if (!row) throw new Error(`Failed to create or find user ${email}`);
  return row.id;
}

// --- Idempotent reset: delete only what we own -----------------------------
async function resetOwnedData(): Promise<void> {
  // Child-first delete order. Each scoped by a tenant id we created.
  for (const t of ALL_TENANT_IDS) {
    // tenant-scoped leaf tables (FK children) first
    await dbRun("DELETE FROM order_items WHERE tenant_id = ?", t);
    await dbRun("DELETE FROM stock_movements WHERE tenant_id = ?", t);
    await dbRun("DELETE FROM orders WHERE tenant_id = ?", t);
    await dbRun("DELETE FROM products WHERE tenant_id = ?", t);
    await dbRun("DELETE FROM categories WHERE tenant_id = ?", t);
    await dbRun("DELETE FROM messages WHERE tenant_id = ?", t);
    await dbRun("DELETE FROM contact_thread_state WHERE tenant_id = ?", t);
    await dbRun("DELETE FROM contact_segments WHERE tenant_id = ?", t);
    await dbRun("DELETE FROM contacts WHERE tenant_id = ?", t);
    await dbRun("DELETE FROM customer_segments WHERE tenant_id = ?", t);
    await dbRun(
      "DELETE FROM whatsapp_group_participants WHERE group_id IN (SELECT id FROM whatsapp_groups WHERE tenant_id = ?)",
      t,
    );
    await dbRun("DELETE FROM whatsapp_groups WHERE tenant_id = ?", t);
    await dbRun("DELETE FROM whatsapp_auto_messages WHERE tenant_id = ?", t);
    await dbRun("DELETE FROM automation_rules WHERE tenant_id = ?", t);
    await dbRun("DELETE FROM workflows WHERE tenant_id = ?", t);
    await dbRun("DELETE FROM complaints WHERE tenant_id = ?", t);
    await dbRun(
      "DELETE FROM service_cards WHERE board_id IN (SELECT id FROM service_boards WHERE tenant_id = ?)",
      t,
    );
    await dbRun(
      "DELETE FROM service_lists WHERE board_id IN (SELECT id FROM service_boards WHERE tenant_id = ?)",
      t,
    );
    await dbRun("DELETE FROM service_boards WHERE tenant_id = ?", t);
    await dbRun(
      "DELETE FROM internal_messages WHERE room_id IN (SELECT id FROM internal_chat_rooms WHERE tenant_id = ?)",
      t,
    );
    await dbRun(
      "DELETE FROM internal_chat_members WHERE room_id IN (SELECT id FROM internal_chat_rooms WHERE tenant_id = ?)",
      t,
    );
    await dbRun("DELETE FROM internal_chat_rooms WHERE tenant_id = ?", t);
    await dbRun("DELETE FROM tenant_expenses WHERE tenant_id = ?", t);
    await dbRun("DELETE FROM tenant_recurring_expenses WHERE tenant_id = ?", t);
    await dbRun("DELETE FROM tenant_expense_categories WHERE tenant_id = ?", t);
    await dbRun("DELETE FROM team_member_permissions WHERE tenant_id = ?", t);
    await dbRun("DELETE FROM in_app_notifications WHERE tenant_id = ?", t);
    await dbRun("DELETE FROM notifications WHERE tenant_id = ?", t);
    await dbRun("DELETE FROM facebook_pages WHERE tenant_id = ?", t);
    await dbRun("DELETE FROM whatsapp_instances WHERE tenant_id = ?", t);
    await dbRun("DELETE FROM payments WHERE tenant_id = ?", t);
    await dbRun("DELETE FROM subscriptions WHERE tenant_id = ?", t);
    await dbRun("DELETE FROM user_roles WHERE tenant_id = ?", t);
    // admin marketing rows tied to this tenant (entity_id = tenant id)
    await dbRun(
      "DELETE FROM admin_marketing_sends WHERE enrollment_id IN (SELECT id FROM admin_marketing_enrollments WHERE entity_id = ?)",
      t,
    );
    await dbRun("DELETE FROM admin_marketing_enrollments WHERE entity_id = ?", t);
    await dbRun("DELETE FROM admin_customer_journey WHERE entity_id = ?", t);
    await dbRun("DELETE FROM admin_tasks WHERE related_tenant_id = ?", t);
    await dbRun("DELETE FROM admin_notifications WHERE tenant_id = ?", t);
    await dbRun("DELETE FROM tenants WHERE id = ?", t);
  }

  // tenant-agnostic demo rows, scoped by deterministic markers we own.
  await dbRun(
    "DELETE FROM admin_marketing_sequences WHERE campaign_id IN (SELECT id FROM admin_marketing_campaigns WHERE created_by = ?)",
    "demo-seed",
  );
  await dbRun("DELETE FROM admin_marketing_campaigns WHERE created_by = ?", "demo-seed");
  await dbRun("DELETE FROM marketing_leads WHERE source = ?", "demo_seed");
  // reminder_settings has no tenant_id column; scope by template_id marker.
  await dbRun("DELETE FROM reminder_settings WHERE template_id = ?", "demo-seed");
}

// --- Demo content arrays ---------------------------------------------------
const CONTACT_NAMES = [
  "Rahim Uddin", "Karima Begum", "Jahangir Alam", "Shirin Akter", "Mizanur Rahman",
  "Farzana Yasmin", "Abdul Karim", "Nusrat Jahan", "Sohel Rana", "Tahmina Khatun",
  "Imran Hossain", "Rumana Parvin", "Saiful Islam", "Lima Akter", "Rashed Khan",
  "Bristy Sultana", "Jamil Ahmed", "Sadia Afrin", "Hasibul Haque", "Mou Chowdhury",
];

const PRODUCT_SEEDS = [
  { name: "Cotton Saree - Red", price: 1850, cost: 1100, stock: 24, cat: "Sarees" },
  { name: "Three Piece - Floral", price: 2400, cost: 1500, stock: 12, cat: "Three Piece" },
  { name: "Panjabi - White", price: 1650, cost: 950, stock: 30, cat: "Panjabi" },
  { name: "Leather Wallet", price: 1200, cost: 600, stock: 8, cat: "Accessories" },
  { name: "Kids Frock - Pink", price: 980, cost: 520, stock: 40, cat: "Kids" },
  { name: "Handbag - Tan", price: 2200, cost: 1300, stock: 6, cat: "Accessories" },
  { name: "Silk Scarf", price: 750, cost: 350, stock: 3, cat: "Accessories" },
  { name: "Denim Jacket", price: 2950, cost: 1800, stock: 15, cat: "Outerwear" },
];

const ORDER_STATUSES = [
  "pending", "confirmed", "shipped", "delivered", "delivered",
  "cancelled", "confirmed", "delivered", "shipped", "pending",
];

const COMPLAINT_SEEDS = [
  { title: "Wrong size delivered", category: "delivery", priority: "high", status: "open" },
  { title: "Item damaged in transit", category: "product_issue", priority: "high", status: "in_progress" },
  { title: "Late delivery", category: "delivery", priority: "medium", status: "resolved" },
  { title: "Color mismatch", category: "product_issue", priority: "low", status: "open" },
];

const LEAD_SEEDS = [
  { name: "Arif Mahmud", biz: "Arif Fashion House", status: "warm" },
  { name: "Sharmin Akter", biz: "Glow Cosmetics BD", status: "hot" },
  { name: "Kamal Hossain", biz: "Kamal Electronics", status: "cold" },
  { name: "Nafisa Rahman", biz: "Nafisa Boutique", status: "warm" },
  { name: "Rezaul Karim", biz: "Karim Grocery", status: "converted" },
  { name: "Mitu Sultana", biz: "Mitu's Kitchen", status: "hot" },
];

// ---------------------------------------------------------------------------
async function seedExtraTenants(ownerId: string): Promise<void> {
  const tenantNames = [
    { name: "Dhaka Threads", slug: "dhaka-threads" },
    { name: "Chittagong Bazaar", slug: "ctg-bazaar" },
    { name: "Sylhet Style Co", slug: "sylhet-style" },
    { name: "Khulna Mart", slug: "khulna-mart" },
  ];
  const subStatuses = ["active", "trialing", "suspended", "active"];

  for (const [i, tid] of DEMO_TENANT_IDS.entries()) {
    const createdMsAgo = (55 - i * 12) * DAY;
    await db.insert(tenants).values({
      id: tid,
      name: tenantNames[i].name,
      slug: tenantNames[i].slug,
      owner_id: ownerId,
      is_activated: true,
      created_at: iso(createdMsAgo),
    });
    await db.insert(userRoles).values({
      tenant_id: tid,
      user_id: ownerId,
      role: "owner",
    });

    const planId = pick(PLAN_IDS, i);
    const status = subStatuses[i];
    await db.insert(subscriptions).values({
      tenant_id: tid,
      plan_id: planId,
      status,
      current_period_start: iso(createdMsAgo),
      current_period_end: iso(-25 * DAY),
      trial_ends_at: status === "trialing" ? iso(-7 * DAY) : null,
      created_at: iso(createdMsAgo),
    });

    // one verified + one pending payment per tenant for revenue + pending KPI
    await db.insert(payments).values([
      {
        tenant_id: tid,
        amount: pick([899, 1499, 2799, 1499], i),
        currency: "BDT",
        payment_method: "bkash",
        status: "verified",
        verified_at: iso((40 - i * 10) * DAY),
        created_at: iso((40 - i * 10) * DAY),
      },
      {
        tenant_id: tid,
        amount: pick([899, 1499, 2799, 1499], i),
        currency: "BDT",
        payment_method: "nagad",
        status: "pending",
        created_at: iso((3 + i) * DAY),
      },
    ]);

    // one WhatsApp instance each so admin instance lists are non-empty
    await db.insert(whatsappInstances).values({
      tenant_id: tid,
      name: `${tenantNames[i].name} WA`,
      phone_number: `88017${String(10000000 + i * 11111).slice(0, 8)}`,
      status: "active",
      last_connected_at: iso(2 * DAY),
    });

    // a few contacts + a recent message so dashboard message/conv counts are non-zero
    for (let c = 0; c < 4; c++) {
      const contactId = crypto.randomUUID();
      const phone = `88018${String(20000000 + i * 1000 + c).slice(0, 8)}`;
      const lastAt = iso((c + 1) * DAY);
      await db.insert(contacts).values({
        id: contactId,
        tenant_id: tid,
        wa_id: `${phone}@s.whatsapp.net`,
        phone_number: phone,
        name: pick(CONTACT_NAMES, i * 4 + c),
        last_message_at: lastAt,
        unread_count: c === 0 ? 1 : 0,
      });
      await db.insert(messages).values({
        tenant_id: tid,
        contact_id: contactId,
        direction: c % 2 === 0 ? "inbound" : "outbound",
        content: "Demo message",
        content_type: "text",
        status: "delivered",
        wa_message_id: `wamid.${contactId}`,
        created_at: lastAt,
        sent_at: lastAt,
      });
    }
  }
}

// ---------------------------------------------------------------------------
async function seedRichTenant(ownerId: string, teamIds: string[]): Promise<{ contacts: number; messages: number; orders: number }> {
  await db
    .insert(tenants)
    .values({
      id: RICH_TENANT_ID,
      name: "Demo Tenant",
      slug: "demo-tenant",
      owner_id: ownerId,
      is_activated: true,
      created_at: iso(60 * DAY),
    });

  await db.insert(userRoles).values({
    tenant_id: RICH_TENANT_ID,
    user_id: ownerId,
    role: "owner",
  });

  // Team members + roles + permissions
  for (const [i, m] of TEAM.entries()) {
    const uid = teamIds[i];
    await db.insert(userRoles).values({
      tenant_id: RICH_TENANT_ID,
      user_id: uid,
      role: m.role,
    });
    await db.insert(teamMemberPermissions).values({
      tenant_id: RICH_TENANT_ID,
      user_id: uid,
      can_view_revenue: m.role === "manager",
      can_access_reports: m.role === "manager",
      can_access_team: m.role === "manager",
    });
  }

  // Subscription (active, pro) + payments
  await db.insert(subscriptions).values({
    tenant_id: RICH_TENANT_ID,
    plan_id: "pro",
    status: "active",
    current_period_start: iso(30 * DAY),
    current_period_end: iso(-30 * DAY),
    created_at: iso(60 * DAY),
  });
  await db.insert(payments).values([
    {
      tenant_id: RICH_TENANT_ID,
      amount: 1499,
      currency: "BDT",
      payment_method: "bkash",
      status: "verified",
      verified_at: iso(30 * DAY),
      created_at: iso(30 * DAY),
    },
    {
      tenant_id: RICH_TENANT_ID,
      amount: 1499,
      currency: "BDT",
      payment_method: "bkash",
      status: "verified",
      verified_at: iso(60 * DAY),
      created_at: iso(60 * DAY),
    },
    {
      tenant_id: RICH_TENANT_ID,
      amount: 1499,
      currency: "BDT",
      payment_method: "nagad",
      status: "pending",
      created_at: iso(1 * DAY),
    },
  ]);

  // Instances: 1 WhatsApp (active) + 1 Facebook page
  const waInstanceId = crypto.randomUUID();
  await db.insert(whatsappInstances).values({
    id: waInstanceId,
    tenant_id: RICH_TENANT_ID,
    name: "Demo Store WA",
    phone_number: "8801711000000",
    status: "active",
    is_default: true,
    last_connected_at: iso(1 * DAY),
  });
  const fbPageId = crypto.randomUUID();
  await db.insert(facebookPages).values({
    id: fbPageId,
    tenant_id: RICH_TENANT_ID,
    page_id: "1000000000001",
    page_name: "Demo Store BD",
    page_access_token: "DEMO_TOKEN_NOT_REAL",
    status: "active",
    is_default: true,
    last_connected_at: iso(1 * DAY),
  });

  // Categories + products + stock movements
  const catNames = [...new Set(PRODUCT_SEEDS.map((p) => p.cat))];
  const catIdByName: Record<string, string> = {};
  for (const [i, name] of catNames.entries()) {
    const id = crypto.randomUUID();
    catIdByName[name] = id;
    await db.insert(categories).values({
      id,
      tenant_id: RICH_TENANT_ID,
      name,
      sort_order: i,
    });
  }
  const productIds: string[] = [];
  for (const p of PRODUCT_SEEDS) {
    const id = crypto.randomUUID();
    productIds.push(id);
    await db.insert(products).values({
      id,
      tenant_id: RICH_TENANT_ID,
      category_id: catIdByName[p.cat],
      name: p.name,
      price: p.price,
      cost_price: p.cost,
      stock_quantity: p.stock,
      low_stock_threshold: 5,
      sku: `SKU-${id.slice(0, 6).toUpperCase()}`,
      is_active: true,
    });
    await db.insert(stockMovements).values({
      tenant_id: RICH_TENANT_ID,
      product_id: id,
      movement_type: "in",
      quantity: p.stock,
      previous_quantity: 0,
      new_quantity: p.stock,
      reason: "initial_stock",
    });
  }

  // Contacts + thread state + messages
  const contactIds: string[] = [];
  let messageCount = 0;
  for (const [i, name] of CONTACT_NAMES.entries()) {
    const contactId = crypto.randomUUID();
    contactIds.push(contactId);
    const phone = `8801712${String(100000 + i).slice(0, 6)}`;
    const lastAt = iso(i * (DAY / 3));
    const unread = i < 4 ? (i % 3) + 1 : 0;
    await db.insert(contacts).values({
      id: contactId,
      tenant_id: RICH_TENANT_ID,
      instance_id: waInstanceId,
      wa_id: `${phone}@s.whatsapp.net`,
      phone_number: phone,
      name,
      last_message_at: lastAt,
      unread_count: unread,
      assigned_to: i % 4 === 0 ? teamIds[0] : null,
    });
    await db.insert(contactThreadState).values({
      contact_id: contactId,
      tenant_id: RICH_TENANT_ID,
      instance_id: waInstanceId,
      contact_name: name,
      contact_phone: phone,
      last_message_at: lastAt,
      last_inbound_at: lastAt,
      last_message_preview: `Hi, is the ${pick(PRODUCT_SEEDS, i).name} available?`,
      last_message_direction: "inbound",
      unread_count: unread,
      total_messages: 4,
    });

    // 4 messages per contact across statuses/directions
    const convo = [
      { dir: "inbound", body: `Hello, interested in ${pick(PRODUCT_SEEDS, i).name}`, st: "delivered", off: 4 },
      { dir: "outbound", body: "Yes it's in stock! Price is shown on the listing.", st: "read", off: 3 },
      { dir: "inbound", body: "Great, can you deliver to Dhaka?", st: "delivered", off: 2 },
      { dir: "outbound", body: "Of course, delivery in 2-3 days.", st: "sent", off: 1 },
    ];
    for (const [j, m] of convo.entries()) {
      const at = iso(i * (DAY / 3) + m.off * 600_000);
      await db.insert(messages).values({
        tenant_id: RICH_TENANT_ID,
        contact_id: contactId,
        instance_id: waInstanceId,
        direction: m.dir,
        content: m.body,
        content_type: "text",
        status: m.st,
        read_at: m.st === "read" ? at : null,
        delivered_at: m.st === "delivered" || m.st === "read" ? at : null,
        wa_message_id: `wamid.${contactId}.${j}`,
        sent_by_user_id: m.dir === "outbound" ? teamIds[i % teamIds.length] : null,
        created_at: at,
        sent_at: at,
      });
      messageCount++;
    }
  }

  // Orders + order items
  let orderCount = 0;
  for (let i = 0; i < ORDER_STATUSES.length; i++) {
    const status = ORDER_STATUSES[i];
    const contactId = contactIds[i % contactIds.length];
    const prod = PRODUCT_SEEDS[i % PRODUCT_SEEDS.length];
    const qty = (i % 3) + 1;
    const subtotal = prod.price * qty;
    const shipping = 80;
    const total = subtotal + shipping;
    const orderId = crypto.randomUUID();
    const createdMsAgo = (i + 1) * 2 * DAY;
    await db.insert(orders).values({
      id: orderId,
      tenant_id: RICH_TENANT_ID,
      contact_id: contactId,
      order_number: `ORD-${1000 + i}`,
      customer_name: pick(CONTACT_NAMES, i),
      customer_phone: `8801712${String(100000 + i).slice(0, 6)}`,
      status,
      payment_status: status === "delivered" ? "paid" : status === "cancelled" ? "unpaid" : "unpaid",
      currency: "BDT",
      subtotal,
      shipping_amount: shipping,
      total,
      source: "whatsapp",
      delivered_at: status === "delivered" ? iso(createdMsAgo - DAY) : null,
      shipped_at: status === "shipped" || status === "delivered" ? iso(createdMsAgo - DAY) : null,
      cancelled_at: status === "cancelled" ? iso(createdMsAgo - DAY) : null,
      created_at: iso(createdMsAgo),
    });
    await db.insert(orderItems).values({
      tenant_id: RICH_TENANT_ID,
      order_id: orderId,
      product_id: productIds[i % productIds.length],
      product_name: prod.name,
      quantity: qty,
      unit_price: prod.price,
      total: subtotal,
    });
    orderCount++;
  }

  // Customer segments + assignments
  const segments = [
    { name: "VIP Customers", icon: "crown", color: "#f59e0b" },
    { name: "New Buyers", icon: "sparkles", color: "#3b82f6" },
    { name: "At Risk", icon: "alert-triangle", color: "#ef4444" },
  ];
  const segIds: string[] = [];
  for (const s of segments) {
    const id = crypto.randomUUID();
    segIds.push(id);
    await db.insert(customerSegments).values({
      id,
      tenant_id: RICH_TENANT_ID,
      name: s.name,
      icon: s.icon,
      color: s.color,
      is_active: true,
    });
  }
  for (let i = 0; i < contactIds.length; i++) {
    await db.insert(contactSegments).values({
      tenant_id: RICH_TENANT_ID,
      contact_id: contactIds[i],
      segment_id: segIds[i % segIds.length],
    });
  }

  // WhatsApp groups + participants
  const groupId = crypto.randomUUID();
  await db.insert(whatsappGroups).values({
    id: groupId,
    tenant_id: RICH_TENANT_ID,
    instance_id: waInstanceId,
    wa_group_id: "120363000000000001@g.us",
    name: "Demo Store VIP Group",
    description: "Top customers broadcast group",
    participant_count: 5,
    is_admin: true,
  });
  for (let i = 0; i < 5; i++) {
    await db.insert(whatsappGroupParticipants).values({
      tenant_id: RICH_TENANT_ID,
      group_id: groupId,
      contact_id: contactIds[i],
      phone_number: `8801712${String(100000 + i).slice(0, 6)}`,
      is_admin: i === 0,
    });
  }

  // Workflows + automation rules + auto-messages
  await db.insert(workflows).values({
    tenant_id: RICH_TENANT_ID,
    name: "Welcome New Contact",
    trigger_type: "new_contact",
    trigger_config: { event: "contact_created" },
    is_active: true,
    created_by: ownerId,
  });
  await db.insert(automationRules).values({
    tenant_id: RICH_TENANT_ID,
    name: "Auto-tag VIP on big order",
    trigger_type: "order_created",
    trigger_config: { min_total: 2000 },
    action_type: "add_segment",
    action_config: { segment: "VIP Customers" },
    is_active: true,
    priority: 1,
  });
  await db.insert(whatsappAutoMessages).values({
    tenant_id: RICH_TENANT_ID,
    welcome_enabled: true,
    welcome_message: "Welcome to Demo Store! How can we help you today?",
    away_enabled: true,
    away_message: "We're currently away and will reply soon.",
    followup_enabled: false,
  });

  // Complaints
  for (const [i, c] of COMPLAINT_SEEDS.entries()) {
    await db.insert(complaints).values({
      tenant_id: RICH_TENANT_ID,
      contact_id: contactIds[i],
      title: c.title,
      description: `${c.title} reported by customer. Following up.`,
      category: c.category,
      priority: c.priority,
      status: c.status,
      reported_by: ownerId,
      assigned_to: teamIds[i % teamIds.length],
      resolved_at: c.status === "resolved" ? iso(2 * DAY) : null,
    });
  }

  // Service board + lists + cards
  const boardId = crypto.randomUUID();
  await db.insert(serviceBoards).values({
    id: boardId,
    tenant_id: RICH_TENANT_ID,
    name: "Order Fulfilment",
    description: "Track orders from confirm to delivery",
    created_by: ownerId,
  });
  const listNames = ["To Do", "In Progress", "Done"];
  const listIds: string[] = [];
  for (const [i, name] of listNames.entries()) {
    const id = crypto.randomUUID();
    listIds.push(id);
    await db.insert(serviceLists).values({
      id,
      board_id: boardId,
      tenant_id: RICH_TENANT_ID,
      name,
      position_numeric: i,
    });
  }
  const cardTitles = [
    "Pack ORD-1003", "Call customer ORD-1005", "Restock Silk Scarf",
    "Confirm courier pickup", "Follow up complaint #2",
  ];
  for (const [i, title] of cardTitles.entries()) {
    await db.insert(serviceCards).values({
      board_id: boardId,
      list_id: listIds[i % listIds.length],
      tenant_id: RICH_TENANT_ID,
      title,
      description: "Auto-generated demo task card.",
      priority: pick(["low", "medium", "high"], i),
      status: "open",
      assigned_to: teamIds[i % teamIds.length],
      created_by: ownerId,
      position_numeric: i,
    });
  }

  // Internal chat room + members + messages
  const roomId = crypto.randomUUID();
  await db.insert(internalChatRooms).values({
    id: roomId,
    tenant_id: RICH_TENANT_ID,
    name: "Team General",
    type: "group",
    created_by: ownerId,
  });
  for (const uid of [ownerId, ...teamIds]) {
    await db.insert(internalChatMembers).values({
      room_id: roomId,
      user_id: uid,
      is_admin: uid === ownerId,
    });
  }
  const chatLines = [
    { uid: ownerId, body: "Morning team, let's clear yesterday's orders." },
    { uid: teamIds[0], body: "On it. Two pending courier pickups." },
    { uid: teamIds[1], body: "Restocking the silk scarves today." },
    { uid: ownerId, body: "Great. Ping me if anything blocks." },
  ];
  for (const [i, line] of chatLines.entries()) {
    await db.insert(internalMessages).values({
      room_id: roomId,
      sender_id: line.uid,
      content: line.body,
      content_type: "text",
      created_at: iso((chatLines.length - i) * 3600_000),
    });
  }

  // Accounting: expense categories + expenses + recurring
  const expCats = [
    { name: "Advertising", icon: "megaphone" },
    { name: "Inventory", icon: "package" },
    { name: "Logistics", icon: "truck" },
    { name: "Salaries", icon: "users" },
  ];
  const expCatIds: string[] = [];
  for (const c of expCats) {
    const id = crypto.randomUUID();
    expCatIds.push(id);
    await db.insert(tenantExpenseCategories).values({
      id,
      tenant_id: RICH_TENANT_ID,
      name: c.name,
      icon: c.icon,
      is_active: true,
    });
  }
  const expenseRows = [
    { amount: 3500, desc: "Facebook ad boost", cat: 0, daysAgo: 5 },
    { amount: 12000, desc: "Stock purchase - sarees", cat: 1, daysAgo: 10 },
    { amount: 1800, desc: "Courier charges", cat: 2, daysAgo: 3 },
    { amount: 25000, desc: "Staff salary - October", cat: 3, daysAgo: 15 },
    { amount: 2200, desc: "Boosted Instagram reel", cat: 0, daysAgo: 1 },
  ];
  for (const e of expenseRows) {
    await db.insert(tenantExpenses).values({
      tenant_id: RICH_TENANT_ID,
      category_id: expCatIds[e.cat],
      amount: e.amount,
      currency: "BDT",
      description: e.desc,
      expense_date: isoDate(e.daysAgo * DAY),
      payment_method: "bkash",
      recorded_by: ownerId,
    });
  }
  await db.insert(tenantRecurringExpenses).values({
    tenant_id: RICH_TENANT_ID,
    category_id: expCatIds[3],
    amount: 25000,
    currency: "BDT",
    description: "Monthly staff salary",
    frequency: "monthly",
    day_of_month: 1,
    next_due_date: isoDate(-15 * DAY),
    is_active: true,
  });

  // In-app + WhatsApp notifications
  await db.insert(notifications).values([
    {
      tenant_id: RICH_TENANT_ID,
      channel: "whatsapp",
      type: "order_confirmation",
      recipient: "8801712100000",
      status: "sent",
      sent_at: iso(2 * DAY),
    },
    {
      tenant_id: RICH_TENANT_ID,
      channel: "whatsapp",
      type: "delivery_update",
      recipient: "8801712100001",
      status: "sent",
      sent_at: iso(1 * DAY),
    },
  ]);
  await db.insert(inAppNotifications).values([
    {
      tenant_id: RICH_TENANT_ID,
      user_id: ownerId,
      type: "new_order",
      title: "New order ORD-1009",
      message: "A new order was placed via WhatsApp.",
      is_read: false,
    },
    {
      tenant_id: RICH_TENANT_ID,
      user_id: ownerId,
      type: "low_stock",
      title: "Low stock: Silk Scarf",
      message: "Only 3 units left.",
      is_read: false,
    },
  ]);

  // Reminder setting (no tenant_id column; marked via template_id for cleanup)
  await db.insert(reminderSettings).values({
    reminder_type: "abandoned_cart",
    channel: "both",
    days_offset: [1, 3, 7],
    is_active: true,
    template_id: "demo-seed",
  });

  return { contacts: contactIds.length, messages: messageCount, orders: orderCount };
}

// ---------------------------------------------------------------------------
async function seedAdminPlatform(ownerId: string): Promise<void> {
  // Marketing leads across statuses
  for (const [i, l] of LEAD_SEEDS.entries()) {
    await db.insert(marketingLeads).values({
      business_name: l.biz,
      full_name: l.name,
      email: `lead${i}@example.com`,
      whatsapp_number: `88019${String(10000000 + i).slice(0, 8)}`,
      status: l.status,
      source: "demo_seed",
      demo_access_count: i % 3,
      created_at: iso((i + 1) * 4 * DAY),
    });
  }

  // Admin marketing campaign + sequences + enrollments + sends
  const campaignId = crypto.randomUUID();
  await db.insert(adminMarketingCampaigns).values({
    id: campaignId,
    name: "Eid Re-engagement",
    name_bn: "ঈদ রিএনগেজমেন্ট",
    type: "nurture",
    status: "active",
    created_by: "demo-seed",
    use_whatsapp: true,
    use_email: true,
  });
  const seqIds: string[] = [];
  const seqs = [
    { name: "Week 1 Welcome", channel: "whatsapp", week: 1, step: 1 },
    { name: "Week 2 Offer", channel: "email", week: 2, step: 2 },
    { name: "Week 3 Reminder", channel: "whatsapp", week: 3, step: 3 },
  ];
  for (const s of seqs) {
    const id = crypto.randomUUID();
    seqIds.push(id);
    await db.insert(adminMarketingSequences).values({
      id,
      campaign_id: campaignId,
      name: s.name,
      channel: s.channel,
      content_template: { body: `${s.name} message body` },
      week_number: s.week,
      step_order: s.step,
      is_active: true,
    });
  }
  // Enroll the demo tenants into the campaign
  for (const [i, tid] of DEMO_TENANT_IDS.entries()) {
    const enrollId = crypto.randomUUID();
    await db.insert(adminMarketingEnrollments).values({
      id: enrollId,
      campaign_id: campaignId,
      entity_id: tid,
      entity_type: "tenant",
      status: i === 0 ? "completed" : "active",
      current_step: i,
      current_week: i + 1,
      total_messages_sent: i,
      enrolled_at: iso((20 - i * 3) * DAY),
    });
    await db.insert(adminMarketingSends).values({
      enrollment_id: enrollId,
      sequence_id: seqIds[i % seqIds.length],
      channel: pick(["whatsapp", "email"], i),
      status: pick(["sent", "delivered", "opened"], i),
      content: { body: "Re-engagement message" },
      sent_at: iso((18 - i * 3) * DAY),
      delivered_at: iso((18 - i * 3) * DAY),
    });
  }

  // Admin customer journey events (entity = rich tenant)
  await db.insert(adminCustomerJourney).values([
    {
      entity_id: RICH_TENANT_ID,
      entity_type: "tenant",
      event_type: "signed_up",
      event_category: "lifecycle",
      title_bn: "সাইন আপ সম্পন্ন",
      channel: "web",
      created_at: iso(60 * DAY),
    },
    {
      entity_id: RICH_TENANT_ID,
      entity_type: "tenant",
      event_type: "first_payment",
      event_category: "billing",
      title_bn: "প্রথম পেমেন্ট",
      channel: "bkash",
      created_at: iso(58 * DAY),
    },
  ]);

  // Admin tasks
  const taskSeeds = [
    { title: "Verify pending payment - Khulna Mart", status: "todo", priority: "high" },
    { title: "Follow up hot lead Glow Cosmetics", status: "in_progress", priority: "high" },
    { title: "Review suspended tenant Sylhet Style", status: "todo", priority: "medium" },
    { title: "Monthly revenue report", status: "done", priority: "low" },
  ];
  for (const [i, t] of taskSeeds.entries()) {
    await db.insert(adminTasks).values({
      title: t.title,
      description: "Demo admin task.",
      status: t.status,
      priority: t.priority,
      assigned_to: ownerId,
      assigned_by: ownerId,
      related_tenant_id: DEMO_TENANT_IDS[i % DEMO_TENANT_IDS.length],
      due_date: iso(-(i + 1) * 2 * DAY),
    });
  }

  // Admin notifications
  await db.insert(adminNotifications).values([
    {
      type: "new_tenant",
      title: "New tenant signed up",
      message: "Dhaka Threads completed onboarding.",
      tenant_id: DEMO_TENANT_IDS[0],
      is_read: false,
    },
    {
      type: "payment_pending",
      title: "Payment awaiting verification",
      message: "Khulna Mart submitted a bKash payment.",
      tenant_id: DEMO_TENANT_IDS[3],
      is_read: false,
    },
  ]);
}

// ---------------------------------------------------------------------------
async function main(): Promise<void> {
  await runMigrations();

  const ownerId = await ensureUser(OWNER_EMAIL, OWNER_PASSWORD, "Demo Owner");
  const teamIds: string[] = [];
  for (const m of TEAM) {
    teamIds.push(await ensureUser(m.email, OWNER_PASSWORD, m.name));
  }

  await resetOwnedData();

  // Profiles for owner + team (upsert).
  await db
    .insert(profiles)
    .values({ id: ownerId, email: OWNER_EMAIL, full_name: "Demo Owner" })
    .onConflictDoNothing();
  for (const [i, m] of TEAM.entries()) {
    await db
      .insert(profiles)
      .values({ id: teamIds[i], email: m.email, full_name: m.name })
      .onConflictDoNothing();
  }

  const richCounts = await seedRichTenant(ownerId, teamIds);
  await seedExtraTenants(ownerId);
  await seedAdminPlatform(ownerId);

  process.stdout.write(
    `Demo seed complete.\n` +
      `  owner login: ${OWNER_EMAIL} / ${OWNER_PASSWORD}\n` +
      `  team logins: ${TEAM_EMAILS.join(", ")} (password: ${OWNER_PASSWORD})\n` +
      `  rich tenant: ${RICH_TENANT_ID} (Demo Tenant)\n` +
      `    contacts=${richCounts.contacts} messages=${richCounts.messages} orders=${richCounts.orders}\n` +
      `  extra tenants: ${DEMO_TENANT_IDS.length}\n`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    process.stderr.write(`Demo seed failed: ${err?.stack ?? err?.message ?? err}\n`);
    process.exit(1);
  });
