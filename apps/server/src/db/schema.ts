import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  integer,
  doublePrecision,
  boolean,
  jsonb,
  index,
  uniqueIndex,
  primaryKey,
} from "drizzle-orm/pg-core";
import { moduleSchema } from "./schema-modules.js";

/**
 * Core Postgres schema, hand-authored from the repo's generated Supabase types
 * (apps/web/src/integrations/supabase/types.ts). Column names and casing match
 * the Postgres source exactly so the supabase shim returns identical row shapes.
 *
 * Type map:
 *   uuid        -> text (crypto.randomUUID default)
 *   timestamptz -> text (ISO-8601, toISOString()) — kept as text so the shim
 *                  returns the same ISO strings the web layer expects
 *   jsonb       -> jsonb
 *   bool        -> boolean
 *   numeric     -> text
 *   numeric money (price/amount/total) -> doublePrecision (UI does arithmetic
 *     on these, so the row shape must expose a number)
 *   text[]      -> jsonb
 */

const uuid = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

const nowIso = sql`to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`;

// ---------------------------------------------------------------------------
// tenants
// ---------------------------------------------------------------------------
export const tenants = pgTable("tenants", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  activated_at: text("activated_at"),
  activated_by: text("activated_by"),
  business_type_id: text("business_type_id"),
  created_at: text("created_at").default(nowIso).notNull(),
  is_activated: boolean("is_activated").default(false),
  logo_url: text("logo_url"),
  name: text("name").notNull(),
  onboarding_status: jsonb("onboarding_status"),
  owner_id: text("owner_id").notNull(),
  pending_plan_id: text("pending_plan_id"),
  settings: jsonb("settings"),
  slug: text("slug"),
  updated_at: text("updated_at").default(nowIso).notNull(),
});

// ---------------------------------------------------------------------------
// profiles (keyed by auth user id; no tenant_id)
// ---------------------------------------------------------------------------
export const profiles = pgTable("profiles", {
  id: text("id").primaryKey(),
  avatar_url: text("avatar_url"),
  created_at: text("created_at").default(nowIso).notNull(),
  created_by: text("created_by"),
  email: text("email"),
  full_name: text("full_name"),
  phone_number: text("phone_number"),
  updated_at: text("updated_at").default(nowIso).notNull(),
});

// ---------------------------------------------------------------------------
// user_roles (tenant membership)
// ---------------------------------------------------------------------------
export const userRoles = pgTable(
  "user_roles",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    created_at: text("created_at").default(nowIso).notNull(),
    role: text("role").default("owner").notNull(),
    tenant_id: text("tenant_id").notNull(),
    updated_at: text("updated_at").default(nowIso).notNull(),
    user_id: text("user_id").notNull(),
  },
  (t) => ({
    tenantIdx: index("user_roles_tenant_id_idx").on(t.tenant_id),
    userIdx: index("user_roles_user_id_idx").on(t.user_id),
    userTenantUnq: uniqueIndex("user_roles_user_tenant_unq").on(t.user_id, t.tenant_id),
  }),
);

// ---------------------------------------------------------------------------
// system_roles (admin detection)
// ---------------------------------------------------------------------------
export const systemRoles = pgTable(
  "system_roles",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    created_at: text("created_at").default(nowIso).notNull(),
    granted_at: text("granted_at"),
    granted_by: text("granted_by"),
    is_super_admin: boolean("is_super_admin"),
    permissions: jsonb("permissions"),
    role: text("role").default("user").notNull(),
    user_id: text("user_id").notNull(),
  },
  (t) => ({
    userIdx: index("system_roles_user_id_idx").on(t.user_id),
  }),
);

// ---------------------------------------------------------------------------
// subscriptions
// ---------------------------------------------------------------------------
export const subscriptions = pgTable(
  "subscriptions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    cancelled_at: text("cancelled_at"),
    created_at: text("created_at").default(nowIso).notNull(),
    current_period_end: text("current_period_end").notNull(),
    current_period_start: text("current_period_start").notNull(),
    feature_overrides: jsonb("feature_overrides"),
    grace_period_ends_at: text("grace_period_ends_at"),
    plan_id: text("plan_id").notNull(),
    resource_overrides: jsonb("resource_overrides"),
    status: text("status").default("trialing").notNull(),
    tenant_id: text("tenant_id").notNull(),
    trial_ends_at: text("trial_ends_at"),
    updated_at: text("updated_at").default(nowIso).notNull(),
  },
  (t) => ({
    tenantIdx: index("subscriptions_tenant_id_idx").on(t.tenant_id),
  }),
);

// ---------------------------------------------------------------------------
// whatsapp_instances
// ---------------------------------------------------------------------------
export const whatsappInstances = pgTable(
  "whatsapp_instances",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    api_key_encrypted: text("api_key_encrypted"),
    connection_error: text("connection_error"),
    created_at: text("created_at").default(nowIso).notNull(),
    deleted_at: text("deleted_at"),
    device_info: jsonb("device_info"),
    is_default: boolean("is_default").default(false).notNull(),
    is_deleted: boolean("is_deleted"),
    last_connected_at: text("last_connected_at"),
    last_qr_sent_at: text("last_qr_sent_at"),
    last_status_at: text("last_status_at"),
    name: text("name").notNull(),
    phone_number: text("phone_number"),
    qr_code: text("qr_code"),
    qr_expires_at: text("qr_expires_at"),
    session_id: text("session_id"),
    status: text("status").default("disconnected").notNull(),
    tenant_id: text("tenant_id").notNull(),
    updated_at: text("updated_at").default(nowIso).notNull(),
    wasender_session_id: text("wasender_session_id"),
    webhook_secret: text("webhook_secret").default("").notNull(),
  },
  (t) => ({
    tenantIdx: index("whatsapp_instances_tenant_id_idx").on(t.tenant_id),
  }),
);

// ---------------------------------------------------------------------------
// contacts
// ---------------------------------------------------------------------------
export const contacts = pgTable(
  "contacts",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    assigned_to: text("assigned_to"),
    created_at: text("created_at").default(nowIso).notNull(),
    device_typing_at: text("device_typing_at"),
    handoff_at: text("handoff_at"),
    handoff_reason: text("handoff_reason"),
    instance_id: text("instance_id"),
    is_archived: boolean("is_archived").default(false).notNull(),
    is_blocked: boolean("is_blocked").default(false).notNull(),
    last_message_at: text("last_message_at"),
    name: text("name"),
    needs_handoff: boolean("needs_handoff").default(false).notNull(),
    phone_number: text("phone_number").notNull(),
    profile_pic_synced_at: text("profile_pic_synced_at"),
    profile_pic_url: text("profile_pic_url"),
    replying_started_at: text("replying_started_at"),
    replying_user_id: text("replying_user_id"),
    tenant_id: text("tenant_id").notNull(),
    unread_count: integer("unread_count").default(0).notNull(),
    updated_at: text("updated_at").default(nowIso).notNull(),
    wa_id: text("wa_id").notNull(),
  },
  (t) => ({
    tenantIdx: index("contacts_tenant_id_idx").on(t.tenant_id),
    instanceWaIdx: index("contacts_instance_id_wa_id_idx").on(t.instance_id, t.wa_id),
  }),
);

// ---------------------------------------------------------------------------
// messages
// ---------------------------------------------------------------------------
export const messages = pgTable(
  "messages",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    contact_id: text("contact_id"),
    content: text("content"),
    content_type: text("content_type").default("text").notNull(),
    created_at: text("created_at").default(nowIso).notNull(),
    delivered_at: text("delivered_at"),
    direction: text("direction").notNull(),
    error_message: text("error_message"),
    instance_id: text("instance_id"),
    is_from_ai: boolean("is_from_ai").default(false).notNull(),
    is_synced_from_device: boolean("is_synced_from_device"),
    location_lat: text("location_lat"),
    location_lng: text("location_lng"),
    media_filename: text("media_filename"),
    media_mime_type: text("media_mime_type"),
    media_url: text("media_url"),
    read_at: text("read_at"),
    reply_to_id: text("reply_to_id"),
    sender_phone: text("sender_phone"),
    sent_at: text("sent_at").default(nowIso).notNull(),
    sent_by_user_id: text("sent_by_user_id"),
    status: text("status").default("pending").notNull(),
    tenant_id: text("tenant_id").notNull(),
    text_preview: text("text_preview"),
    wa_group_id: text("wa_group_id"),
    wa_message_id: text("wa_message_id"),
  },
  (t) => ({
    tenantIdx: index("messages_tenant_id_idx").on(t.tenant_id),
    waMessageUnq: uniqueIndex("messages_wa_message_id_unq").on(t.wa_message_id),
    contactCreatedIdx: index("messages_contact_id_created_at_idx").on(
      t.contact_id,
      t.created_at,
    ),
    // Tenant-wide history / exports / stats scans: keeps tenant_id leading so the
    // planner prunes to one tenant then walks created_at in order.
    tenantCreatedIdx: index("messages_tenant_id_created_at_idx").on(
      t.tenant_id,
      t.created_at,
    ),
  }),
);

// ---------------------------------------------------------------------------
// contact_thread_state
// ---------------------------------------------------------------------------
export const contactThreadState = pgTable(
  "contact_thread_state",
  {
    contact_id: text("contact_id").primaryKey(),
    assigned_to: text("assigned_to"),
    contact_avatar_url: text("contact_avatar_url"),
    contact_name: text("contact_name"),
    contact_phone: text("contact_phone"),
    contact_type: text("contact_type").default("whatsapp").notNull(),
    created_at: text("created_at").default(nowIso).notNull(),
    handoff_reason: text("handoff_reason"),
    instance_id: text("instance_id"),
    is_archived: boolean("is_archived").default(false).notNull(),
    is_blocked: boolean("is_blocked").default(false).notNull(),
    label_ids: jsonb("label_ids"),
    last_inbound_at: text("last_inbound_at"),
    last_message_at: text("last_message_at").default(nowIso).notNull(),
    last_message_direction: text("last_message_direction"),
    last_message_preview: text("last_message_preview"),
    last_message_type: text("last_message_type"),
    needs_handoff: boolean("needs_handoff").default(false).notNull(),
    tenant_id: text("tenant_id").notNull(),
    total_messages: integer("total_messages").default(0).notNull(),
    unread_count: integer("unread_count").default(0).notNull(),
    updated_at: text("updated_at").default(nowIso).notNull(),
  },
  (t) => ({
    tenantLastMsgIdx: index("contact_thread_state_tenant_id_last_message_at_idx").on(
      t.tenant_id,
      t.last_message_at,
    ),
  }),
);

// ---------------------------------------------------------------------------
// contact_labels
// ---------------------------------------------------------------------------
export const contactLabels = pgTable(
  "contact_labels",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    contact_id: text("contact_id"),
    created_at: text("created_at").default(nowIso).notNull(),
    label_id: text("label_id").notNull(),
  },
  (t) => ({
    contactIdx: index("contact_labels_contact_id_idx").on(t.contact_id),
  }),
);

// ---------------------------------------------------------------------------
// quick_replies
// ---------------------------------------------------------------------------
export const quickReplies = pgTable(
  "quick_replies",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    content: text("content").notNull(),
    content_type: text("content_type"),
    created_at: text("created_at").default(nowIso).notNull(),
    media_filename: text("media_filename"),
    media_items: jsonb("media_items"),
    media_url: text("media_url"),
    shortcut: text("shortcut"),
    tenant_id: text("tenant_id").notNull(),
    title: text("title").notNull(),
    updated_at: text("updated_at").default(nowIso).notNull(),
  },
  (t) => ({
    tenantIdx: index("quick_replies_tenant_id_idx").on(t.tenant_id),
  }),
);

// ---------------------------------------------------------------------------
// message_templates (tenant-scoped: each tenant manages its own templates)
// ---------------------------------------------------------------------------
export const messageTemplates = pgTable(
  "message_templates",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    // Nullable at the DB level only because SQLite cannot ADD a NOT NULL column
    // without a default to an existing table. Tenancy is enforced at the app
    // layer: query-tables marks tenantColumn "tenant_id" so reads are scoped and
    // forceTenantOnRow stamps it on every insert.
    tenant_id: text("tenant_id"),
    category: text("category").notNull(),
    channel: text("channel").default("whatsapp").notNull(),
    content: text("content").notNull(),
    created_at: text("created_at").default(nowIso),
    is_active: boolean("is_active"),
    name: text("name").notNull(),
    placeholders: jsonb("placeholders"),
    subject: text("subject"),
    updated_at: text("updated_at").default(nowIso),
  },
  (t) => ({
    tenantIdx: index("message_templates_tenant_id_idx").on(t.tenant_id),
  }),
);

// ---------------------------------------------------------------------------
// tenant_daily_stats (composite PK: tenant_id + stat_date)
// ---------------------------------------------------------------------------
export const tenantDailyStats = pgTable(
  "tenant_daily_stats",
  {
    tenant_id: text("tenant_id").notNull(),
    stat_date: text("stat_date").notNull(),
    active_conversations: integer("active_conversations").default(0).notNull(),
    fb_inbound: integer("fb_inbound").default(0).notNull(),
    fb_outbound: integer("fb_outbound").default(0).notNull(),
    inbound_count: integer("inbound_count").default(0).notNull(),
    new_conversations: integer("new_conversations").default(0).notNull(),
    outbound_count: integer("outbound_count").default(0).notNull(),
    updated_at: text("updated_at").default(nowIso).notNull(),
    wa_inbound: integer("wa_inbound").default(0).notNull(),
    wa_outbound: integer("wa_outbound").default(0).notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.tenant_id, t.stat_date] }),
  }),
);

// ---------------------------------------------------------------------------
// notifications
// ---------------------------------------------------------------------------
export const notifications = pgTable(
  "notifications",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    channel: text("channel").notNull(),
    created_at: text("created_at").default(nowIso).notNull(),
    error_message: text("error_message"),
    instance_id: text("instance_id"),
    metadata: jsonb("metadata"),
    recipient: text("recipient"),
    sent_at: text("sent_at"),
    status: text("status").default("pending").notNull(),
    tenant_id: text("tenant_id").notNull(),
    type: text("type").notNull(),
  },
  (t) => ({
    tenantIdx: index("notifications_tenant_id_idx").on(t.tenant_id),
  }),
);

// ---------------------------------------------------------------------------
// admin_audit_logs (impersonation + admin action audit trail)
// ---------------------------------------------------------------------------
export const adminAuditLogs = pgTable(
  "admin_audit_logs",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    action: text("action").notNull(),
    admin_id: text("admin_id"),
    created_at: text("created_at").default(nowIso).notNull(),
    details: jsonb("details"),
    entity_id: text("entity_id"),
    entity_type: text("entity_type").notNull(),
  },
  (t) => ({
    adminIdx: index("admin_audit_logs_admin_id_idx").on(t.admin_id),
  }),
);

// ---------------------------------------------------------------------------
// usage_counters (per-tenant per-period message counters)
// ---------------------------------------------------------------------------
export const usageCounters = pgTable(
  "usage_counters",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    ai_messages: integer("ai_messages").default(0).notNull(),
    created_at: text("created_at").default(nowIso).notNull(),
    messages_received: integer("messages_received").default(0).notNull(),
    messages_sent: integer("messages_sent").default(0).notNull(),
    period_end: text("period_end").notNull(),
    period_start: text("period_start").notNull(),
    tenant_id: text("tenant_id").notNull(),
    updated_at: text("updated_at").default(nowIso).notNull(),
  },
  (t) => ({
    tenantPeriodUnq: uniqueIndex("usage_counters_tenant_period_unq").on(
      t.tenant_id,
      t.period_start,
    ),
  }),
);

// ---------------------------------------------------------------------------
// webhook_events_log (raw inbound webhook audit + replay)
// ---------------------------------------------------------------------------
export const webhookEventsLog = pgTable(
  "webhook_events_log",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    created_at: text("created_at").default(nowIso).notNull(),
    error: text("error"),
    event_type: text("event_type").notNull(),
    instance_id: text("instance_id"),
    payload: jsonb("payload").notNull(),
    processed: boolean("processed").default(false).notNull(),
    tenant_id: text("tenant_id"),
  },
  (t) => ({
    instanceIdx: index("webhook_events_log_instance_id_idx").on(t.instance_id),
  }),
);

// ---------------------------------------------------------------------------
// error_logs (self-hosted error sink — backend + frontend crashes)
// ---------------------------------------------------------------------------
export const errorLogs = pgTable(
  "error_logs",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    source: text("source").notNull(), // 'backend' | 'frontend'
    severity: text("severity").default("error").notNull(),
    fingerprint: text("fingerprint").notNull(),
    message: text("message").notNull(),
    stack: text("stack"),
    tenant_id: text("tenant_id"),
    user_id: text("user_id"),
    url: text("url"),
    meta: jsonb("meta"),
    created_at: text("created_at").default(nowIso).notNull(),
  },
  (t) => ({
    createdIdx: index("error_logs_created_at_idx").on(t.created_at),
    fingerprintIdx: index("error_logs_fingerprint_idx").on(t.fingerprint),
  }),
);

// ---------------------------------------------------------------------------
// message_raw_payloads (raw provider payload keyed by our message id)
// ---------------------------------------------------------------------------
export const messageRawPayloads = pgTable("message_raw_payloads", {
  message_id: text("message_id").primaryKey(),
  created_at: text("created_at").default(nowIso).notNull(),
  provider_metadata: jsonb("provider_metadata"),
  raw_payload: jsonb("raw_payload"),
});

// ---------------------------------------------------------------------------
// plans (global pricing catalog; not tenant-scoped)
// ---------------------------------------------------------------------------
export const plans = pgTable("plans", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  ai_enabled: boolean("ai_enabled").default(false).notNull(),
  business_type_id: text("business_type_id"),
  created_at: text("created_at").default(nowIso).notNull(),
  description: text("description"),
  features: jsonb("features"),
  is_active: boolean("is_active").default(true).notNull(),
  max_agents: integer("max_agents").default(1).notNull(),
  max_instances: integer("max_instances").default(1).notNull(),
  max_messages_per_month: integer("max_messages_per_month").default(1000).notNull(),
  /** Facebook pages (each with optional linked Instagram) the tenant may connect. */
  max_pages: integer("max_pages").default(1).notNull(),
  name: text("name").notNull(),
  price_monthly: doublePrecision("price_monthly").default(0).notNull(),
  price_yearly: doublePrecision("price_yearly"),
  tier: text("tier"),
  tier_order: integer("tier_order"),
  updated_at: text("updated_at").default(nowIso).notNull(),
});

// ---------------------------------------------------------------------------
// payments (manual + gateway payment records; written by server flows only)
// ---------------------------------------------------------------------------
export const payments = pgTable(
  "payments",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    amount: doublePrecision("amount").notNull(),
    created_at: text("created_at").default(nowIso).notNull(),
    currency: text("currency").default("BDT").notNull(),
    gateway_response: jsonb("gateway_response"),
    notes: text("notes"),
    payment_gateway: text("payment_gateway"),
    payment_method: text("payment_method").notNull(),
    status: text("status").default("pending").notNull(),
    subscription_id: text("subscription_id"),
    tenant_id: text("tenant_id").notNull(),
    transaction_id: text("transaction_id"),
    uddoktapay_invoice_id: text("uddoktapay_invoice_id"),
    verified_at: text("verified_at"),
    verified_by: text("verified_by"),
  },
  (t) => ({
    tenantIdx: index("payments_tenant_id_idx").on(t.tenant_id),
  }),
);

// ---------------------------------------------------------------------------
// categories (product categories)
// ---------------------------------------------------------------------------
export const categories = pgTable(
  "categories",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    created_at: text("created_at").default(nowIso).notNull(),
    description: text("description"),
    image_url: text("image_url"),
    is_active: boolean("is_active").default(true),
    name: text("name").notNull(),
    parent_id: text("parent_id"),
    sort_order: integer("sort_order").default(0),
    tenant_id: text("tenant_id").notNull(),
    updated_at: text("updated_at").default(nowIso).notNull(),
    woo_category_id: integer("woo_category_id"),
  },
  (t) => ({
    tenantIdx: index("categories_tenant_id_idx").on(t.tenant_id),
  }),
);

// ---------------------------------------------------------------------------
// products
// ---------------------------------------------------------------------------
export const products = pgTable(
  "products",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    category_id: text("category_id"),
    compare_at_price: doublePrecision("compare_at_price"),
    cost_price: doublePrecision("cost_price"),
    created_at: text("created_at").default(nowIso).notNull(),
    description: text("description"),
    images: jsonb("images"),
    is_active: boolean("is_active").default(true),
    low_stock_threshold: integer("low_stock_threshold").default(5),
    name: text("name").notNull(),
    price: doublePrecision("price").default(0).notNull(),
    sku: text("sku"),
    stock_quantity: integer("stock_quantity").default(0),
    tags: jsonb("tags"),
    tenant_id: text("tenant_id").notNull(),
    track_inventory: boolean("track_inventory").default(true),
    updated_at: text("updated_at").default(nowIso).notNull(),
    variant_options: jsonb("variant_options"),
    variants: jsonb("variants"),
    woo_last_synced_at: text("woo_last_synced_at"),
    woo_product_id: integer("woo_product_id"),
  },
  (t) => ({
    tenantIdx: index("products_tenant_id_idx").on(t.tenant_id),
  }),
);

// ---------------------------------------------------------------------------
// product_variants
// ---------------------------------------------------------------------------
export const productVariants = pgTable(
  "product_variants",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    compare_at_price: doublePrecision("compare_at_price"),
    cost_price: doublePrecision("cost_price"),
    created_at: text("created_at").default(nowIso),
    images: jsonb("images"),
    is_active: boolean("is_active").default(true),
    low_stock_threshold: integer("low_stock_threshold").default(5),
    name: text("name").notNull(),
    options: jsonb("options"),
    position: integer("position").default(0),
    price: doublePrecision("price"),
    product_id: text("product_id").notNull(),
    sku: text("sku"),
    stock_quantity: integer("stock_quantity").default(0),
    tenant_id: text("tenant_id").notNull(),
    updated_at: text("updated_at").default(nowIso),
    woo_variant_id: integer("woo_variant_id"),
  },
  (t) => ({
    tenantIdx: index("product_variants_tenant_id_idx").on(t.tenant_id),
    productIdx: index("product_variants_product_id_idx").on(t.product_id),
  }),
);

// ---------------------------------------------------------------------------
// orders
// ---------------------------------------------------------------------------
export const orders = pgTable(
  "orders",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    billing_address: jsonb("billing_address"),
    cancelled_at: text("cancelled_at"),
    contact_id: text("contact_id"),
    courier: text("courier"),
    created_at: text("created_at").default(nowIso).notNull(),
    created_by: text("created_by"),
    currency: text("currency").default("USD").notNull(),
    customer_email: text("customer_email"),
    customer_name: text("customer_name"),
    customer_phone: text("customer_phone"),
    delivered_at: text("delivered_at"),
    discount_amount: doublePrecision("discount_amount").default(0),
    internal_notes: text("internal_notes"),
    notes: text("notes"),
    order_number: text("order_number").notNull(),
    payment_status: text("payment_status").default("unpaid").notNull(),
    shipped_at: text("shipped_at"),
    shipping_address: jsonb("shipping_address"),
    shipping_amount: doublePrecision("shipping_amount").default(0),
    source: text("source"),
    status: text("status").default("pending").notNull(),
    subtotal: doublePrecision("subtotal").default(0).notNull(),
    tax_amount: doublePrecision("tax_amount").default(0),
    tenant_id: text("tenant_id").notNull(),
    total: doublePrecision("total").default(0).notNull(),
    tracking_number: text("tracking_number"),
    updated_at: text("updated_at").default(nowIso).notNull(),
    woo_order_id: integer("woo_order_id"),
  },
  (t) => ({
    tenantIdx: index("orders_tenant_id_idx").on(t.tenant_id),
    contactIdx: index("orders_contact_id_idx").on(t.contact_id),
  }),
);

// ---------------------------------------------------------------------------
// order_items
// tenant_id is NOT in the Postgres source (legacy scoped via the orders join);
// added here so the generic /api/query tenant scoping covers this table too.
// Inserts through the query API get it stamped by forceTenantOnRow.
// ---------------------------------------------------------------------------
export const orderItems = pgTable(
  "order_items",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    created_at: text("created_at").default(nowIso).notNull(),
    discount_amount: doublePrecision("discount_amount").default(0),
    notes: text("notes"),
    order_id: text("order_id").notNull(),
    product_id: text("product_id"),
    product_name: text("product_name").notNull(),
    product_sku: text("product_sku"),
    quantity: integer("quantity").default(1).notNull(),
    tenant_id: text("tenant_id").notNull(),
    total: doublePrecision("total").notNull(),
    unit_price: doublePrecision("unit_price").notNull(),
    variant_id: text("variant_id"),
    variant_name: text("variant_name"),
  },
  (t) => ({
    orderIdx: index("order_items_order_id_idx").on(t.order_id),
    tenantIdx: index("order_items_tenant_id_idx").on(t.tenant_id),
  }),
);

// ---------------------------------------------------------------------------
// facebook_pages (connected Messenger pages; token used by Graph API calls)
// ---------------------------------------------------------------------------
export const facebookPages = pgTable(
  "facebook_pages",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    app_secret: text("app_secret"),
    created_at: text("created_at").default(nowIso).notNull(),
    is_default: boolean("is_default").default(false).notNull(),
    last_connected_at: text("last_connected_at"),
    // Linked Instagram Business/Creator account (discovered during OAuth connect;
    // null = Facebook-only page, which is fully supported).
    ig_account_id: text("ig_account_id"),
    ig_connected_at: text("ig_connected_at"),
    ig_profile_picture_url: text("ig_profile_picture_url"),
    ig_username: text("ig_username"),
    page_access_token: text("page_access_token").notNull(),
    page_id: text("page_id").notNull(),
    page_name: text("page_name").notNull(),
    profile_picture_url: text("profile_picture_url"),
    status: text("status").default("disconnected").notNull(),
    tenant_id: text("tenant_id").notNull(),
    token_expires_at: text("token_expires_at"),
    updated_at: text("updated_at").default(nowIso).notNull(),
    webhook_verify_token: text("webhook_verify_token")
      .notNull()
      .$defaultFn(() => crypto.randomUUID().replace(/-/g, "")),
  },
  (t) => ({
    tenantIdx: index("facebook_pages_tenant_id_idx").on(t.tenant_id),
    tenantPageUnq: uniqueIndex("facebook_pages_tenant_page_unq").on(t.tenant_id, t.page_id),
  }),
);

// ---------------------------------------------------------------------------
// fb_contacts (Messenger conversations, keyed by page-scoped PSID)
// ---------------------------------------------------------------------------
export const fbContacts = pgTable(
  "fb_contacts",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    assigned_to: text("assigned_to"),
    created_at: text("created_at").default(nowIso).notNull(),
    handoff_at: text("handoff_at"),
    handoff_reason: text("handoff_reason"),
    is_archived: boolean("is_archived").default(false).notNull(),
    is_blocked: boolean("is_blocked").default(false).notNull(),
    last_message_at: text("last_message_at"),
    locale: text("locale"),
    name: text("name"),
    needs_handoff: boolean("needs_handoff").default(false).notNull(),
    page_id: text("page_id").notNull(),
    // 'facebook' (Messenger PSID) or 'instagram' (IGSID via the linked IG account).
    platform: text("platform").default("facebook").notNull(),
    profile_pic_synced_at: text("profile_pic_synced_at"),
    profile_pic_url: text("profile_pic_url"),
    psid: text("psid").notNull(),
    tags: jsonb("tags"),
    tenant_id: text("tenant_id").notNull(),
    typing_at: text("typing_at"),
    unread_count: integer("unread_count").default(0).notNull(),
    updated_at: text("updated_at").default(nowIso).notNull(),
  },
  (t) => ({
    tenantIdx: index("fb_contacts_tenant_id_idx").on(t.tenant_id),
    pagePsidUnq: uniqueIndex("fb_contacts_page_psid_unq").on(t.page_id, t.psid),
  }),
);

// ---------------------------------------------------------------------------
// fb_messages
// ---------------------------------------------------------------------------
export const fbMessages = pgTable(
  "fb_messages",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    attachment_id: text("attachment_id"),
    contact_id: text("contact_id").notNull(),
    content: text("content"),
    content_type: text("content_type").default("text").notNull(),
    created_at: text("created_at").default(nowIso).notNull(),
    delivered_at: text("delivered_at"),
    direction: text("direction").notNull(),
    error_message: text("error_message"),
    is_from_ai: boolean("is_from_ai").default(false).notNull(),
    media_filename: text("media_filename"),
    media_mime_type: text("media_mime_type"),
    media_url: text("media_url"),
    mid: text("mid"),
    original_media_url: text("original_media_url"),
    page_id: text("page_id").notNull(),
    quick_reply_payload: text("quick_reply_payload"),
    read_at: text("read_at"),
    reply_to_id: text("reply_to_id"),
    retry_count: integer("retry_count").default(0).notNull(),
    sent_at: text("sent_at").default(nowIso).notNull(),
    sent_by_user_id: text("sent_by_user_id"),
    status: text("status").default("pending").notNull(),
    tenant_id: text("tenant_id").notNull(),
    text_preview: text("text_preview"),
  },
  (t) => ({
    tenantIdx: index("fb_messages_tenant_id_idx").on(t.tenant_id),
    midUnq: uniqueIndex("fb_messages_mid_unq").on(t.mid),
    contactCreatedIdx: index("fb_messages_contact_id_created_at_idx").on(
      t.contact_id,
      t.created_at,
    ),
  }),
);

// ---------------------------------------------------------------------------
// llm_settings (per-tenant LLM provider config; api_key_encrypted is sensitive —
// NEVER expose this table via the generic /api/query allowlist)
// ---------------------------------------------------------------------------
export const llmSettings = pgTable(
  "llm_settings",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    api_key_encrypted: text("api_key_encrypted"),
    created_at: text("created_at").default(nowIso).notNull(),
    is_byok: boolean("is_byok").default(false).notNull(),
    model: text("model"),
    monthly_token_budget: integer("monthly_token_budget"),
    provider: text("provider"),
    temperature: doublePrecision("temperature"),
    tenant_id: text("tenant_id").notNull(),
    updated_at: text("updated_at").default(nowIso).notNull(),
  },
  (t) => ({
    tenantUnq: uniqueIndex("llm_settings_tenant_unq").on(t.tenant_id),
  }),
);

// ---------------------------------------------------------------------------
// llm_usage_events (per-call token usage for billing/budget enforcement)
// ---------------------------------------------------------------------------
export const llmUsageEvents = pgTable(
  "llm_usage_events",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    completion_tokens: integer("completion_tokens").default(0).notNull(),
    cost_usd: doublePrecision("cost_usd").default(0).notNull(),
    created_at: text("created_at").default(nowIso).notNull(),
    feature: text("feature").notNull(),
    model: text("model").notNull(),
    prompt_tokens: integer("prompt_tokens").default(0).notNull(),
    provider: text("provider").notNull(),
    tenant_id: text("tenant_id").notNull(),
  },
  (t) => ({
    tenantCreatedIdx: index("llm_usage_events_tenant_created_idx").on(
      t.tenant_id,
      t.created_at,
    ),
  }),
);

// ---------------------------------------------------------------------------
// agent_souls (AI persona auto-built from the tenant's FB page + website)
// ---------------------------------------------------------------------------
export const agentSouls = pgTable(
  "agent_souls",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    approved_at: text("approved_at"),
    business_profile: jsonb("business_profile"),
    created_at: text("created_at").default(nowIso).notNull(),
    error_message: text("error_message"),
    faqs: jsonb("faqs"),
    hours: jsonb("hours"),
    languages: jsonb("languages"),
    policies: jsonb("policies"),
    products_summary: text("products_summary"),
    status: text("status").default("pending").notNull(),
    system_prompt_cache: text("system_prompt_cache"),
    tenant_id: text("tenant_id").notNull(),
    tone: jsonb("tone"),
    updated_at: text("updated_at").default(nowIso).notNull(),
    version: integer("version").default(1).notNull(),
  },
  (t) => ({
    tenantUnq: uniqueIndex("agent_souls_tenant_unq").on(t.tenant_id),
  }),
);

// ---------------------------------------------------------------------------
// soul_sources (raw ingested source text per soul)
// ---------------------------------------------------------------------------
export const soulSources = pgTable(
  "soul_sources",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    content_text: text("content_text"),
    created_at: text("created_at").default(nowIso).notNull(),
    error: text("error"),
    fetched_at: text("fetched_at"),
    soul_id: text("soul_id").notNull(),
    status: text("status").default("pending").notNull(),
    tenant_id: text("tenant_id").notNull(),
    type: text("type").notNull(),
    url: text("url"),
  },
  (t) => ({
    tenantIdx: index("soul_sources_tenant_id_idx").on(t.tenant_id),
    soulIdx: index("soul_sources_soul_id_idx").on(t.soul_id),
  }),
);

// ---------------------------------------------------------------------------
// job_queue (durable in-process background jobs; polled by jobs/worker.ts)
// ---------------------------------------------------------------------------
export const jobQueue = pgTable(
  "job_queue",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    attempts: integer("attempts").default(0).notNull(),
    created_at: text("created_at").default(nowIso).notNull(),
    /** Coalescing key: a new job with the same key replaces a queued one. */
    dedupe_key: text("dedupe_key"),
    kind: text("kind").notNull(),
    last_error: text("last_error"),
    payload: jsonb("payload"),
    run_at: text("run_at").default(nowIso).notNull(),
    status: text("status").default("queued").notNull(),
    tenant_id: text("tenant_id"),
    updated_at: text("updated_at").default(nowIso).notNull(),
  },
  (t) => ({
    statusRunAtIdx: index("job_queue_status_run_at_idx").on(t.status, t.run_at),
    dedupeIdx: index("job_queue_dedupe_key_idx").on(t.dedupe_key),
  }),
);

// ---------------------------------------------------------------------------
// agent_configs (per-tenant, per-agent behavior config: hermes | ceo)
// ---------------------------------------------------------------------------
export const agentConfigs = pgTable(
  "agent_configs",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    agent: text("agent").notNull(),
    channels: jsonb("channels"),
    created_at: text("created_at").default(nowIso).notNull(),
    enabled: boolean("enabled").default(false).notNull(),
    escalation_keywords: jsonb("escalation_keywords"),
    max_turns_before_handoff: integer("max_turns_before_handoff").default(10),
    model_override: text("model_override"),
    reply_delay_ms: integer("reply_delay_ms").default(8000).notNull(),
    tenant_id: text("tenant_id").notNull(),
    updated_at: text("updated_at").default(nowIso).notNull(),
    working_hours: jsonb("working_hours"),
  },
  (t) => ({
    tenantAgentUnq: uniqueIndex("agent_configs_tenant_agent_unq").on(t.tenant_id, t.agent),
  }),
);

// ---------------------------------------------------------------------------
// agent_runs (observability: every agent invocation with tokens + outcome)
// ---------------------------------------------------------------------------
export const agentRuns = pgTable(
  "agent_runs",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    agent: text("agent").notNull(),
    completion_tokens: integer("completion_tokens").default(0).notNull(),
    contact_id: text("contact_id"),
    created_at: text("created_at").default(nowIso).notNull(),
    error: text("error"),
    input_preview: text("input_preview"),
    latency_ms: integer("latency_ms"),
    output_preview: text("output_preview"),
    prompt_tokens: integer("prompt_tokens").default(0).notNull(),
    status: text("status").notNull(),
    tenant_id: text("tenant_id").notNull(),
    tool_calls: jsonb("tool_calls"),
    trigger: text("trigger"),
  },
  (t) => ({
    tenantCreatedIdx: index("agent_runs_tenant_created_idx").on(t.tenant_id, t.created_at),
  }),
);

// ---------------------------------------------------------------------------
// crypto_payment_requests (manual USDT transfer checkout)
// txid is globally UNIQUE — the txid-reuse fraud guard. unique_amount is the
// plan price plus a cent salt so concurrent payments are distinguishable
// on-chain. Writes happen only via fn handlers / the admin approval route.
// ---------------------------------------------------------------------------
export const cryptoPaymentRequests = pgTable(
  "crypto_payment_requests",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    amount_usd: doublePrecision("amount_usd").notNull(),
    coupon_id: text("coupon_id"),
    created_at: text("created_at").default(nowIso).notNull(),
    currency: text("currency").default("USDT").notNull(),
    expires_at: text("expires_at").notNull(),
    network: text("network").notNull(),
    plan_id: text("plan_id").notNull(),
    review_note: text("review_note"),
    reviewed_at: text("reviewed_at"),
    reviewed_by: text("reviewed_by"),
    status: text("status").default("awaiting_payment").notNull(),
    submitted_at: text("submitted_at"),
    tenant_id: text("tenant_id").notNull(),
    txid: text("txid"),
    unique_amount: doublePrecision("unique_amount").notNull(),
    wallet_address: text("wallet_address").notNull(),
  },
  (t) => ({
    tenantIdx: index("crypto_payment_requests_tenant_id_idx").on(t.tenant_id),
    txidUnq: uniqueIndex("crypto_payment_requests_txid_unq").on(t.txid),
    statusIdx: index("crypto_payment_requests_status_idx").on(t.status),
  }),
);

// ---------------------------------------------------------------------------
// coupons (admin-managed; NOT exposed via /api/query — codes must not enumerate)
// ---------------------------------------------------------------------------
export const coupons = pgTable(
  "coupons",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    code: text("code").notNull(),
    created_at: text("created_at").default(nowIso).notNull(),
    created_by: text("created_by"),
    discount_type: text("discount_type").notNull(),
    expires_at: text("expires_at"),
    is_active: boolean("is_active").default(true).notNull(),
    max_uses: integer("max_uses"),
    note: text("note"),
    plan_ids: jsonb("plan_ids"),
    updated_at: text("updated_at").default(nowIso).notNull(),
    used_count: integer("used_count").default(0).notNull(),
    value: doublePrecision("value").notNull(),
  },
  (t) => ({
    codeUnq: uniqueIndex("coupons_code_unq").on(t.code),
  }),
);

// ---------------------------------------------------------------------------
// coupon_redemptions (one redemption per coupon per tenant)
// ---------------------------------------------------------------------------
export const couponRedemptions = pgTable(
  "coupon_redemptions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    amount_discounted: doublePrecision("amount_discounted"),
    coupon_id: text("coupon_id").notNull(),
    created_at: text("created_at").default(nowIso).notNull(),
    crypto_request_id: text("crypto_request_id"),
    payment_id: text("payment_id"),
    tenant_id: text("tenant_id").notNull(),
  },
  (t) => ({
    couponTenantUnq: uniqueIndex("coupon_redemptions_coupon_tenant_unq").on(
      t.coupon_id,
      t.tenant_id,
    ),
  }),
);

// ---------------------------------------------------------------------------
// telegram_links (owner chat binding via single-use deep-link code)
// ---------------------------------------------------------------------------
export const telegramLinks = pgTable(
  "telegram_links",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    chat_id: text("chat_id"),
    created_at: text("created_at").default(nowIso).notNull(),
    expires_at: text("expires_at").notNull(),
    link_code: text("link_code").notNull(),
    linked_at: text("linked_at"),
    status: text("status").default("pending").notNull(),
    tenant_id: text("tenant_id").notNull(),
    user_id: text("user_id").notNull(),
  },
  (t) => ({
    linkCodeUnq: uniqueIndex("telegram_links_link_code_unq").on(t.link_code),
    tenantIdx: index("telegram_links_tenant_id_idx").on(t.tenant_id),
  }),
);

// ---------------------------------------------------------------------------
// ceo_reports (generated business reports + marketing ideas)
// ---------------------------------------------------------------------------
export const ceoReports = pgTable(
  "ceo_reports",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    content_md: text("content_md"),
    created_at: text("created_at").default(nowIso).notNull(),
    data_snapshot: jsonb("data_snapshot"),
    error: text("error"),
    sent_at: text("sent_at"),
    status: text("status").default("pending").notNull(),
    tenant_id: text("tenant_id").notNull(),
    type: text("type").notNull(),
  },
  (t) => ({
    tenantCreatedIdx: index("ceo_reports_tenant_created_idx").on(t.tenant_id, t.created_at),
  }),
);

// ---------------------------------------------------------------------------
// agent_schedules (per-tenant report cadence, evaluated by the scheduler tick)
// ---------------------------------------------------------------------------
export const agentSchedules = pgTable(
  "agent_schedules",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    agent: text("agent").default("ceo").notNull(),
    cadence: text("cadence").notNull(),
    created_at: text("created_at").default(nowIso).notNull(),
    enabled: boolean("enabled").default(true).notNull(),
    hour_utc: integer("hour_utc").default(9).notNull(),
    last_run_at: text("last_run_at"),
    report_type: text("report_type").notNull(),
    tenant_id: text("tenant_id").notNull(),
    updated_at: text("updated_at").default(nowIso).notNull(),
  },
  (t) => ({
    tenantTypeUnq: uniqueIndex("agent_schedules_tenant_type_unq").on(
      t.tenant_id,
      t.agent,
      t.report_type,
    ),
  }),
);

// ---------------------------------------------------------------------------
// push_subscriptions (web push endpoints per user; pruned on 404/410)
// ---------------------------------------------------------------------------
export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    created_at: text("created_at").default(nowIso).notNull(),
    endpoint: text("endpoint").notNull(),
    keys: jsonb("keys").notNull(),
    tenant_id: text("tenant_id").notNull(),
    user_agent: text("user_agent"),
    user_id: text("user_id").notNull(),
  },
  (t) => ({
    endpointUnq: uniqueIndex("push_subscriptions_endpoint_unq").on(t.endpoint),
    tenantIdx: index("push_subscriptions_tenant_id_idx").on(t.tenant_id),
  }),
);

export const appSchema = {
  tenants,
  profiles,
  userRoles,
  systemRoles,
  subscriptions,
  whatsappInstances,
  contacts,
  messages,
  contactThreadState,
  contactLabels,
  quickReplies,
  messageTemplates,
  tenantDailyStats,
  notifications,
  adminAuditLogs,
  usageCounters,
  webhookEventsLog,
  errorLogs,
  messageRawPayloads,
  plans,
  payments,
  categories,
  products,
  productVariants,
  orders,
  orderItems,
  facebookPages,
  fbContacts,
  fbMessages,
  llmSettings,
  llmUsageEvents,
  agentSouls,
  soulSources,
  jobQueue,
  agentConfigs,
  agentRuns,
  cryptoPaymentRequests,
  coupons,
  couponRedemptions,
  telegramLinks,
  ceoReports,
  agentSchedules,
  pushSubscriptions,
  ...moduleSchema,
};

// Re-export Phase 3 module tables so consumers can import them from this module
// alongside the core tables.
export * from "./schema-modules.js";
