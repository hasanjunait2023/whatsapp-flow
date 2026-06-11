import { sql } from "drizzle-orm";
import {
  sqliteTable,
  text,
  integer,
  index,
  uniqueIndex,
  primaryKey,
} from "drizzle-orm/sqlite-core";

/**
 * Core SQLite schema, hand-authored from the repo's generated Supabase types
 * (apps/web/src/integrations/supabase/types.ts). Column names and casing match
 * the Postgres source exactly so the supabase shim returns identical row shapes.
 *
 * Type map (per migration plan):
 *   uuid        -> text (crypto.randomUUID default)
 *   timestamptz -> text (ISO-8601, toISOString())
 *   jsonb       -> text ({ mode: "json" })
 *   bool        -> integer ({ mode: "boolean" })
 *   numeric     -> text
 *   text[]      -> text ({ mode: "json" })
 */

const uuid = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

const nowIso = sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`;

// ---------------------------------------------------------------------------
// tenants
// ---------------------------------------------------------------------------
export const tenants = sqliteTable("tenants", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  activated_at: text("activated_at"),
  activated_by: text("activated_by"),
  business_type_id: text("business_type_id"),
  created_at: text("created_at").default(nowIso).notNull(),
  is_activated: integer("is_activated", { mode: "boolean" }).default(false),
  logo_url: text("logo_url"),
  name: text("name").notNull(),
  onboarding_status: text("onboarding_status", { mode: "json" }),
  owner_id: text("owner_id").notNull(),
  pending_plan_id: text("pending_plan_id"),
  settings: text("settings", { mode: "json" }),
  slug: text("slug"),
  updated_at: text("updated_at").default(nowIso).notNull(),
});

// ---------------------------------------------------------------------------
// profiles (keyed by auth user id; no tenant_id)
// ---------------------------------------------------------------------------
export const profiles = sqliteTable("profiles", {
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
export const userRoles = sqliteTable(
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
export const systemRoles = sqliteTable(
  "system_roles",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    created_at: text("created_at").default(nowIso).notNull(),
    granted_at: text("granted_at"),
    granted_by: text("granted_by"),
    is_super_admin: integer("is_super_admin", { mode: "boolean" }),
    permissions: text("permissions", { mode: "json" }),
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
export const subscriptions = sqliteTable(
  "subscriptions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    cancelled_at: text("cancelled_at"),
    created_at: text("created_at").default(nowIso).notNull(),
    current_period_end: text("current_period_end").notNull(),
    current_period_start: text("current_period_start").notNull(),
    feature_overrides: text("feature_overrides", { mode: "json" }),
    grace_period_ends_at: text("grace_period_ends_at"),
    plan_id: text("plan_id").notNull(),
    resource_overrides: text("resource_overrides", { mode: "json" }),
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
export const whatsappInstances = sqliteTable(
  "whatsapp_instances",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    api_key_encrypted: text("api_key_encrypted"),
    connection_error: text("connection_error"),
    created_at: text("created_at").default(nowIso).notNull(),
    deleted_at: text("deleted_at"),
    device_info: text("device_info", { mode: "json" }),
    is_default: integer("is_default", { mode: "boolean" }).default(false).notNull(),
    is_deleted: integer("is_deleted", { mode: "boolean" }),
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
export const contacts = sqliteTable(
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
    is_archived: integer("is_archived", { mode: "boolean" }).default(false).notNull(),
    is_blocked: integer("is_blocked", { mode: "boolean" }).default(false).notNull(),
    last_message_at: text("last_message_at"),
    name: text("name"),
    needs_handoff: integer("needs_handoff", { mode: "boolean" }).default(false).notNull(),
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
export const messages = sqliteTable(
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
    is_from_ai: integer("is_from_ai", { mode: "boolean" }).default(false).notNull(),
    is_synced_from_device: integer("is_synced_from_device", { mode: "boolean" }),
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
  }),
);

// ---------------------------------------------------------------------------
// contact_thread_state
// ---------------------------------------------------------------------------
export const contactThreadState = sqliteTable(
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
    is_archived: integer("is_archived", { mode: "boolean" }).default(false).notNull(),
    is_blocked: integer("is_blocked", { mode: "boolean" }).default(false).notNull(),
    label_ids: text("label_ids", { mode: "json" }),
    last_inbound_at: text("last_inbound_at"),
    last_message_at: text("last_message_at").default(nowIso).notNull(),
    last_message_direction: text("last_message_direction"),
    last_message_preview: text("last_message_preview"),
    last_message_type: text("last_message_type"),
    needs_handoff: integer("needs_handoff", { mode: "boolean" }).default(false).notNull(),
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
export const contactLabels = sqliteTable(
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
export const quickReplies = sqliteTable(
  "quick_replies",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    content: text("content").notNull(),
    content_type: text("content_type"),
    created_at: text("created_at").default(nowIso).notNull(),
    media_filename: text("media_filename"),
    media_items: text("media_items", { mode: "json" }),
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
// message_templates (no tenant_id in source schema)
// ---------------------------------------------------------------------------
export const messageTemplates = sqliteTable("message_templates", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  category: text("category").notNull(),
  channel: text("channel").default("whatsapp").notNull(),
  content: text("content").notNull(),
  created_at: text("created_at").default(nowIso),
  is_active: integer("is_active", { mode: "boolean" }),
  name: text("name").notNull(),
  placeholders: text("placeholders", { mode: "json" }),
  subject: text("subject"),
  updated_at: text("updated_at").default(nowIso),
});

// ---------------------------------------------------------------------------
// tenant_daily_stats (composite PK: tenant_id + stat_date)
// ---------------------------------------------------------------------------
export const tenantDailyStats = sqliteTable(
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
export const notifications = sqliteTable(
  "notifications",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    channel: text("channel").notNull(),
    created_at: text("created_at").default(nowIso).notNull(),
    error_message: text("error_message"),
    instance_id: text("instance_id"),
    metadata: text("metadata", { mode: "json" }),
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
export const adminAuditLogs = sqliteTable(
  "admin_audit_logs",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    action: text("action").notNull(),
    admin_id: text("admin_id"),
    created_at: text("created_at").default(nowIso).notNull(),
    details: text("details", { mode: "json" }),
    entity_id: text("entity_id"),
    entity_type: text("entity_type").notNull(),
  },
  (t) => ({
    adminIdx: index("admin_audit_logs_admin_id_idx").on(t.admin_id),
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
};
