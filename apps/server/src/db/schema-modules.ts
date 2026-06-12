import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, real, index, uniqueIndex } from "drizzle-orm/sqlite-core";

/**
 * Phase 3 module tables. Hand-authored from supabase/migrations CREATE TABLE
 * statements (REPO schema is the source of truth, not the plan).
 *
 * Kept in a separate module from db/schema.ts so the core/WAHA/AI tables and
 * the billing (crypto/coupons) tables can evolve without merge churn here.
 *
 * Type map (matches db/schema.ts header):
 *   uuid        -> text
 *   timestamptz -> text (ISO-8601)
 *   bool        -> integer({ mode: "boolean" })
 *   jsonb       -> text({ mode: "json" })
 *   text[]      -> text({ mode: "json" })
 *   numeric/money columns the UI does arithmetic on -> real
 */

const nowIso = sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`;
const uid = () => text("id").primaryKey().$defaultFn(() => crypto.randomUUID());

// --- Contacts / Segments / Labels ------------------------------------------
export const labels = sqliteTable(
  "labels",
  {
    id: uid(),
    color: text("color").default("#6366f1").notNull(),
    created_at: text("created_at").default(nowIso).notNull(),
    name: text("name").notNull(),
    tenant_id: text("tenant_id").notNull(),
  },
  (t) => ({
    tenantIdx: index("labels_tenant_id_idx").on(t.tenant_id),
    tenantNameUnq: uniqueIndex("labels_tenant_name_unq").on(t.tenant_id, t.name),
  }),
);

export const fbContactLabels = sqliteTable(
  "fb_contact_labels",
  {
    id: uid(),
    contact_id: text("contact_id").notNull(),
    created_at: text("created_at").default(nowIso).notNull(),
    label_id: text("label_id").notNull(),
  },
  (t) => ({
    contactIdx: index("fb_contact_labels_contact_id_idx").on(t.contact_id),
    contactLabelUnq: uniqueIndex("fb_contact_labels_contact_label_unq").on(t.contact_id, t.label_id),
  }),
);

export const customerSegments = sqliteTable(
  "customer_segments",
  {
    id: uid(),
    color: text("color").default("#3B82F6"),
    created_at: text("created_at").default(nowIso),
    description: text("description"),
    icon: text("icon").default("users"),
    is_active: integer("is_active", { mode: "boolean" }).default(true),
    is_auto: integer("is_auto", { mode: "boolean" }).default(false),
    name: text("name").notNull(),
    rules: text("rules", { mode: "json" }),
    tenant_id: text("tenant_id").notNull(),
    updated_at: text("updated_at").default(nowIso),
  },
  (t) => ({
    tenantIdx: index("customer_segments_tenant_id_idx").on(t.tenant_id),
    tenantNameUnq: uniqueIndex("customer_segments_tenant_name_unq").on(t.tenant_id, t.name),
  }),
);

export const contactSegments = sqliteTable(
  "contact_segments",
  {
    id: uid(),
    assigned_at: text("assigned_at").default(nowIso),
    assigned_by: text("assigned_by"),
    assignment_reason: text("assignment_reason"),
    contact_id: text("contact_id").notNull(),
    segment_id: text("segment_id").notNull(),
    tenant_id: text("tenant_id"),
  },
  (t) => ({
    contactIdx: index("contact_segments_contact_id_idx").on(t.contact_id),
    contactSegmentUnq: uniqueIndex("contact_segments_contact_segment_unq").on(t.contact_id, t.segment_id),
  }),
);

export const customerScores = sqliteTable(
  "customer_scores",
  {
    id: uid(),
    avg_order_value: real("avg_order_value").default(0),
    contact_id: text("contact_id").notNull(),
    created_at: text("created_at").default(nowIso),
    first_order_date: text("first_order_date"),
    last_calculated_at: text("last_calculated_at").default(nowIso),
    last_order_date: text("last_order_date"),
    message_count: integer("message_count").default(0),
    score: integer("score").default(0),
    score_tier: text("score_tier").default("new"),
    tenant_id: text("tenant_id").notNull(),
    total_orders: integer("total_orders").default(0),
    total_spent: real("total_spent").default(0),
    updated_at: text("updated_at").default(nowIso),
  },
  (t) => ({
    tenantIdx: index("customer_scores_tenant_id_idx").on(t.tenant_id),
    contactUnq: uniqueIndex("customer_scores_contact_unq").on(t.contact_id),
  }),
);

export const customerScoringRules = sqliteTable(
  "customer_scoring_rules",
  {
    id: uid(),
    created_at: text("created_at").default(nowIso),
    criteria_type: text("criteria_type").notNull(),
    description: text("description"),
    is_active: integer("is_active", { mode: "boolean" }).default(true),
    name: text("name").notNull(),
    operator: text("operator").notNull(),
    points: integer("points").default(0).notNull(),
    tenant_id: text("tenant_id").notNull(),
    value_max: real("value_max"),
    value_min: real("value_min"),
  },
  (t) => ({
    tenantIdx: index("customer_scoring_rules_tenant_id_idx").on(t.tenant_id),
  }),
);

export const customerJourneyEvents = sqliteTable(
  "customer_journey_events",
  {
    id: uid(),
    contact_id: text("contact_id").notNull(),
    created_at: text("created_at").default(nowIso).notNull(),
    created_by: text("created_by"),
    description: text("description"),
    event_category: text("event_category").notNull(),
    event_type: text("event_type").notNull(),
    metadata: text("metadata", { mode: "json" }),
    tenant_id: text("tenant_id").notNull(),
    title: text("title").notNull(),
  },
  (t) => ({
    tenantIdx: index("customer_journey_events_tenant_id_idx").on(t.tenant_id),
    contactIdx: index("customer_journey_events_contact_id_idx").on(t.contact_id),
  }),
);

export const purchaseBehaviorChecks = sqliteTable(
  "purchase_behavior_checks",
  {
    id: uid(),
    cancelled_deliveries: integer("cancelled_deliveries").default(0),
    checked_at: text("checked_at").default(nowIso),
    checked_by: text("checked_by"),
    contact_id: text("contact_id"),
    courier_stats: text("courier_stats", { mode: "json" }),
    created_at: text("created_at").default(nowIso),
    customer_rating: real("customer_rating"),
    phone_number: text("phone_number").notNull(),
    raw_response: text("raw_response", { mode: "json" }),
    returned_deliveries: integer("returned_deliveries").default(0),
    risk_level: text("risk_level"),
    successful_deliveries: integer("successful_deliveries").default(0),
    tenant_id: text("tenant_id").notNull(),
    total_deliveries: integer("total_deliveries").default(0),
    updated_at: text("updated_at").default(nowIso),
  },
  (t) => ({
    tenantIdx: index("purchase_behavior_checks_tenant_id_idx").on(t.tenant_id),
  }),
);

// --- Orders / Inventory ----------------------------------------------------
export const stockMovements = sqliteTable(
  "stock_movements",
  {
    id: uid(),
    created_at: text("created_at").default(nowIso).notNull(),
    movement_type: text("movement_type").notNull(),
    new_quantity: integer("new_quantity").notNull(),
    notes: text("notes"),
    previous_quantity: integer("previous_quantity").notNull(),
    product_id: text("product_id").notNull(),
    quantity: integer("quantity").notNull(),
    reason: text("reason"),
    recorded_by: text("recorded_by"),
    reference_id: text("reference_id"),
    reference_type: text("reference_type"),
    tenant_id: text("tenant_id").notNull(),
    variant_id: text("variant_id"),
  },
  (t) => ({
    tenantIdx: index("stock_movements_tenant_id_idx").on(t.tenant_id),
    productIdx: index("stock_movements_product_id_idx").on(t.product_id),
  }),
);

export const stockAlerts = sqliteTable(
  "stock_alerts",
  {
    id: uid(),
    alert_type: text("alert_type").notNull(),
    created_at: text("created_at").default(nowIso).notNull(),
    is_active: integer("is_active", { mode: "boolean" }).default(true),
    last_triggered_at: text("last_triggered_at"),
    product_id: text("product_id").notNull(),
    tenant_id: text("tenant_id").notNull(),
    threshold: integer("threshold").notNull(),
    variant_id: text("variant_id"),
  },
  (t) => ({
    tenantIdx: index("stock_alerts_tenant_id_idx").on(t.tenant_id),
  }),
);

export const orderStatusHistory = sqliteTable(
  "order_status_history",
  {
    id: uid(),
    created_at: text("created_at").default(nowIso).notNull(),
    created_by: text("created_by"),
    notes: text("notes"),
    order_id: text("order_id").notNull(),
    status: text("status").notNull(),
    tenant_id: text("tenant_id"),
  },
  (t) => ({
    orderIdx: index("order_status_history_order_id_idx").on(t.order_id),
  }),
);

// --- Invoices / Shipments / Courier ----------------------------------------
export const invoices = sqliteTable(
  "invoices",
  {
    id: uid(),
    created_at: text("created_at").default(nowIso),
    invoice_number: text("invoice_number").notNull(),
    order_id: text("order_id"),
    pdf_url: text("pdf_url"),
    sent_at: text("sent_at"),
    sent_via_whatsapp: integer("sent_via_whatsapp", { mode: "boolean" }).default(false),
    tenant_id: text("tenant_id").notNull(),
    total: real("total"),
  },
  (t) => ({
    tenantIdx: index("invoices_tenant_id_idx").on(t.tenant_id),
  }),
);

export const invoiceSettings = sqliteTable(
  "invoice_settings",
  {
    id: uid(),
    company_address: text("company_address"),
    company_email: text("company_email"),
    company_name: text("company_name"),
    company_phone: text("company_phone"),
    created_at: text("created_at").default(nowIso),
    footer_text: text("footer_text"),
    invoice_prefix: text("invoice_prefix").default("INV-"),
    logo_url: text("logo_url"),
    next_invoice_number: integer("next_invoice_number").default(1),
    tax_id: text("tax_id"),
    tenant_id: text("tenant_id").notNull(),
    updated_at: text("updated_at").default(nowIso),
  },
  (t) => ({
    tenantUnq: uniqueIndex("invoice_settings_tenant_unq").on(t.tenant_id),
  }),
);

export const shipments = sqliteTable(
  "shipments",
  {
    id: uid(),
    booked_at: text("booked_at"),
    cod_amount: real("cod_amount"),
    consignment_id: text("consignment_id"),
    courier: text("courier").notNull(),
    courier_response: text("courier_response", { mode: "json" }),
    created_at: text("created_at").default(nowIso),
    delivered_at: text("delivered_at"),
    delivery_address: text("delivery_address", { mode: "json" }),
    delivery_fee: real("delivery_fee"),
    item_description: text("item_description"),
    order_id: text("order_id").notNull(),
    pickup_address: text("pickup_address", { mode: "json" }),
    special_instructions: text("special_instructions"),
    status: text("status").default("pending"),
    tenant_id: text("tenant_id").notNull(),
    tracking_code: text("tracking_code"),
    updated_at: text("updated_at").default(nowIso),
    weight_kg: real("weight_kg"),
  },
  (t) => ({
    tenantIdx: index("shipments_tenant_id_idx").on(t.tenant_id),
    orderIdx: index("shipments_order_id_idx").on(t.order_id),
  }),
);

export const courierIntegrations = sqliteTable(
  "courier_integrations",
  {
    id: uid(),
    api_key: text("api_key"),
    api_secret: text("api_secret"),
    created_at: text("created_at").default(nowIso),
    default_pickup_address: text("default_pickup_address", { mode: "json" }),
    is_active: integer("is_active", { mode: "boolean" }).default(true),
    provider: text("provider").notNull(),
    settings: text("settings", { mode: "json" }),
    store_id: text("store_id"),
    tenant_id: text("tenant_id").notNull(),
    updated_at: text("updated_at").default(nowIso),
  },
  (t) => ({
    tenantIdx: index("courier_integrations_tenant_id_idx").on(t.tenant_id),
    tenantProviderUnq: uniqueIndex("courier_integrations_tenant_provider_unq").on(t.tenant_id, t.provider),
  }),
);

export const complaints = sqliteTable(
  "complaints",
  {
    id: uid(),
    assigned_to: text("assigned_to"),
    category: text("category").default("other").notNull(),
    contact_id: text("contact_id"),
    created_at: text("created_at").default(nowIso).notNull(),
    description: text("description").notNull(),
    order_id: text("order_id"),
    priority: text("priority").default("medium").notNull(),
    reported_by: text("reported_by").notNull(),
    resolution_notes: text("resolution_notes"),
    resolved_at: text("resolved_at"),
    resolved_by: text("resolved_by"),
    status: text("status").default("open").notNull(),
    tenant_id: text("tenant_id").notNull(),
    title: text("title").notNull(),
    updated_at: text("updated_at").default(nowIso).notNull(),
  },
  (t) => ({
    tenantIdx: index("complaints_tenant_id_idx").on(t.tenant_id),
  }),
);

// --- Automation / Workflows / Auto-messages --------------------------------
export const automationRules = sqliteTable(
  "automation_rules",
  {
    id: uid(),
    action_config: text("action_config", { mode: "json" }).notNull(),
    action_type: text("action_type").notNull(),
    created_at: text("created_at").default(nowIso).notNull(),
    description: text("description"),
    is_active: integer("is_active", { mode: "boolean" }).default(true).notNull(),
    name: text("name").notNull(),
    priority: integer("priority").default(0).notNull(),
    tenant_id: text("tenant_id").notNull(),
    trigger_config: text("trigger_config", { mode: "json" }).notNull(),
    trigger_type: text("trigger_type").notNull(),
    updated_at: text("updated_at").default(nowIso).notNull(),
  },
  (t) => ({
    tenantIdx: index("automation_rules_tenant_id_idx").on(t.tenant_id),
  }),
);

export const whatsappAutoMessages = sqliteTable(
  "whatsapp_auto_messages",
  {
    id: uid(),
    away_cooldown_hours: integer("away_cooldown_hours").default(24),
    away_enabled: integer("away_enabled", { mode: "boolean" }).default(false),
    away_media_items: text("away_media_items", { mode: "json" }),
    away_message: text("away_message"),
    created_at: text("created_at").default(nowIso),
    followup_delay_hours: integer("followup_delay_hours").default(6),
    followup_enabled: integer("followup_enabled", { mode: "boolean" }).default(false),
    followup_media_items: text("followup_media_items", { mode: "json" }),
    followup_message: text("followup_message"),
    tenant_id: text("tenant_id").notNull(),
    updated_at: text("updated_at").default(nowIso),
    welcome_enabled: integer("welcome_enabled", { mode: "boolean" }).default(false),
    welcome_media_items: text("welcome_media_items", { mode: "json" }),
    welcome_message: text("welcome_message"),
  },
  (t) => ({
    tenantUnq: uniqueIndex("whatsapp_auto_messages_tenant_unq").on(t.tenant_id),
  }),
);

export const whatsappAutoMessageLog = sqliteTable(
  "whatsapp_auto_message_log",
  {
    id: uid(),
    contact_id: text("contact_id").notNull(),
    message_type: text("message_type").notNull(),
    sent_at: text("sent_at").default(nowIso),
    tenant_id: text("tenant_id").notNull(),
  },
  (t) => ({
    tenantIdx: index("whatsapp_auto_message_log_tenant_id_idx").on(t.tenant_id),
  }),
);

export const whatsappFollowupQueue = sqliteTable(
  "whatsapp_followup_queue",
  {
    id: uid(),
    contact_id: text("contact_id").notNull(),
    created_at: text("created_at").default(nowIso),
    instance_id: text("instance_id").notNull(),
    scheduled_for: text("scheduled_for").notNull(),
    skip_reason: text("skip_reason"),
    status: text("status").default("pending"),
    tenant_id: text("tenant_id").notNull(),
  },
  (t) => ({
    tenantIdx: index("whatsapp_followup_queue_tenant_id_idx").on(t.tenant_id),
  }),
);

export const workflows = sqliteTable(
  "workflows",
  {
    id: uid(),
    created_at: text("created_at").default(nowIso),
    created_by: text("created_by"),
    description: text("description"),
    is_active: integer("is_active", { mode: "boolean" }).default(false),
    name: text("name").notNull(),
    tenant_id: text("tenant_id").notNull(),
    trigger_config: text("trigger_config", { mode: "json" }),
    trigger_type: text("trigger_type").notNull(),
    updated_at: text("updated_at").default(nowIso),
  },
  (t) => ({
    tenantIdx: index("workflows_tenant_id_idx").on(t.tenant_id),
  }),
);

export const workflowNodes = sqliteTable(
  "workflow_nodes",
  {
    id: uid(),
    created_at: text("created_at").default(nowIso),
    node_config: text("node_config", { mode: "json" }),
    node_subtype: text("node_subtype"),
    node_type: text("node_type").notNull(),
    position_x: real("position_x").default(0),
    position_y: real("position_y").default(0),
    tenant_id: text("tenant_id"),
    workflow_id: text("workflow_id").notNull(),
  },
  (t) => ({
    workflowIdx: index("workflow_nodes_workflow_id_idx").on(t.workflow_id),
  }),
);

export const workflowEdges = sqliteTable(
  "workflow_edges",
  {
    id: uid(),
    created_at: text("created_at").default(nowIso),
    label: text("label"),
    source_handle: text("source_handle"),
    source_node_id: text("source_node_id").notNull(),
    target_handle: text("target_handle"),
    target_node_id: text("target_node_id").notNull(),
    tenant_id: text("tenant_id"),
    workflow_id: text("workflow_id").notNull(),
  },
  (t) => ({
    workflowIdx: index("workflow_edges_workflow_id_idx").on(t.workflow_id),
  }),
);

export const workflowExecutions = sqliteTable(
  "workflow_executions",
  {
    id: uid(),
    completed_at: text("completed_at"),
    contact_id: text("contact_id"),
    error_message: text("error_message"),
    execution_data: text("execution_data", { mode: "json" }),
    started_at: text("started_at").default(nowIso),
    status: text("status").default("running"),
    tenant_id: text("tenant_id").notNull(),
    workflow_id: text("workflow_id").notNull(),
  },
  (t) => ({
    tenantIdx: index("workflow_executions_tenant_id_idx").on(t.tenant_id),
  }),
);

// --- Groups ----------------------------------------------------------------
export const whatsappGroups = sqliteTable(
  "whatsapp_groups",
  {
    id: uid(),
    created_at: text("created_at").default(nowIso),
    description: text("description"),
    instance_id: text("instance_id").notNull(),
    invite_link: text("invite_link"),
    is_admin: integer("is_admin", { mode: "boolean" }).default(true),
    name: text("name").notNull(),
    participant_count: integer("participant_count").default(0),
    synced_at: text("synced_at").default(nowIso),
    tenant_id: text("tenant_id").notNull(),
    updated_at: text("updated_at").default(nowIso),
    wa_group_id: text("wa_group_id").notNull(),
  },
  (t) => ({
    tenantIdx: index("whatsapp_groups_tenant_id_idx").on(t.tenant_id),
    tenantGroupUnq: uniqueIndex("whatsapp_groups_tenant_group_unq").on(t.tenant_id, t.wa_group_id),
  }),
);

export const whatsappGroupParticipants = sqliteTable(
  "whatsapp_group_participants",
  {
    id: uid(),
    added_at: text("added_at").default(nowIso),
    added_by: text("added_by"),
    contact_id: text("contact_id"),
    group_id: text("group_id").notNull(),
    is_admin: integer("is_admin", { mode: "boolean" }).default(false),
    phone_number: text("phone_number").notNull(),
    tenant_id: text("tenant_id"),
  },
  (t) => ({
    groupIdx: index("whatsapp_group_participants_group_id_idx").on(t.group_id),
    groupPhoneUnq: uniqueIndex("whatsapp_group_participants_group_phone_unq").on(t.group_id, t.phone_number),
  }),
);

export const groupAddQueue = sqliteTable(
  "group_add_queue",
  {
    id: uid(),
    batch_size: integer("batch_size").default(5),
    completed_at: text("completed_at"),
    created_at: text("created_at").default(nowIso),
    created_by: text("created_by"),
    error_log: text("error_log", { mode: "json" }),
    failed_count: integer("failed_count").default(0),
    group_id: text("group_id").notNull(),
    interval_minutes: integer("interval_minutes").default(30),
    phone_numbers: text("phone_numbers", { mode: "json" }).notNull(),
    processed_count: integer("processed_count").default(0),
    scheduled_for: text("scheduled_for").notNull(),
    status: text("status").default("pending"),
    tenant_id: text("tenant_id").notNull(),
  },
  (t) => ({
    tenantIdx: index("group_add_queue_tenant_id_idx").on(t.tenant_id),
  }),
);

export const tenantDailyGroupLimits = sqliteTable(
  "tenant_daily_group_limits",
  {
    id: uid(),
    date: text("date").notNull(),
    max_daily_limit: integer("max_daily_limit").default(50),
    members_added: integer("members_added").default(0),
    tenant_id: text("tenant_id").notNull(),
  },
  (t) => ({
    tenantDateUnq: uniqueIndex("tenant_daily_group_limits_tenant_date_unq").on(t.tenant_id, t.date),
  }),
);

// --- FB posts / comments ---------------------------------------------------
export const fbPosts = sqliteTable(
  "fb_posts",
  {
    id: uid(),
    comment_count: integer("comment_count").default(0),
    created_at: text("created_at").default(nowIso),
    created_time: text("created_time"),
    fb_post_id: text("fb_post_id").notNull(),
    full_picture: text("full_picture"),
    is_hidden: integer("is_hidden", { mode: "boolean" }).default(false),
    last_comment_at: text("last_comment_at"),
    message: text("message"),
    page_id: text("page_id").notNull(),
    permalink_url: text("permalink_url"),
    post_type: text("post_type").default("status"),
    tenant_id: text("tenant_id").notNull(),
    unread_comment_count: integer("unread_comment_count").default(0),
    updated_at: text("updated_at").default(nowIso),
  },
  (t) => ({
    tenantIdx: index("fb_posts_tenant_id_idx").on(t.tenant_id),
    pagePostUnq: uniqueIndex("fb_posts_page_post_unq").on(t.page_id, t.fb_post_id),
  }),
);

export const fbPostComments = sqliteTable(
  "fb_post_comments",
  {
    id: uid(),
    attachment_type: text("attachment_type"),
    attachment_url: text("attachment_url"),
    commenter_fb_id: text("commenter_fb_id").notNull(),
    commenter_name: text("commenter_name"),
    commenter_picture_url: text("commenter_picture_url"),
    created_at: text("created_at").default(nowIso),
    created_time: text("created_time"),
    fb_comment_id: text("fb_comment_id").notNull(),
    fb_contact_id: text("fb_contact_id"),
    is_from_page: integer("is_from_page", { mode: "boolean" }).default(false),
    is_hidden: integer("is_hidden", { mode: "boolean" }).default(false),
    is_read: integer("is_read", { mode: "boolean" }).default(false),
    like_count: integer("like_count").default(0),
    message: text("message"),
    page_id: text("page_id").notNull(),
    parent_comment_id: text("parent_comment_id"),
    // 'facebook' or 'instagram' (IG comment ids reply via /{id}/replies).
    platform: text("platform").default("facebook").notNull(),
    post_id: text("post_id").notNull(),
    reply_count: integer("reply_count").default(0),
    sent_by_user_id: text("sent_by_user_id"),
    tenant_id: text("tenant_id").notNull(),
    updated_at: text("updated_at").default(nowIso),
  },
  (t) => ({
    tenantIdx: index("fb_post_comments_tenant_id_idx").on(t.tenant_id),
    commentUnq: uniqueIndex("fb_post_comments_comment_unq").on(t.fb_comment_id),
  }),
);

// --- Billing (subscription orders / external sales) ------------------------
export const subscriptionOrders = sqliteTable(
  "subscription_orders",
  {
    id: uid(),
    amount: real("amount").notNull(),
    billing_cycle: text("billing_cycle").default("monthly"),
    created_at: text("created_at").default(nowIso),
    created_by: text("created_by"),
    currency: text("currency").default("BDT"),
    notes: text("notes"),
    order_number: text("order_number").notNull(),
    payment_method: text("payment_method"),
    plan_id: text("plan_id").notNull(),
    status: text("status").default("pending"),
    tenant_id: text("tenant_id").notNull(),
    transaction_id: text("transaction_id"),
    updated_at: text("updated_at").default(nowIso),
    verified_at: text("verified_at"),
    verified_by: text("verified_by"),
  },
  (t) => ({
    tenantIdx: index("subscription_orders_tenant_id_idx").on(t.tenant_id),
    orderNumberUnq: uniqueIndex("subscription_orders_order_number_unq").on(t.order_number),
  }),
);

export const externalSalesOrders = sqliteTable(
  "external_sales_orders",
  {
    id: uid(),
    amount: real("amount").notNull(),
    billing_cycle: text("billing_cycle").default("monthly").notNull(),
    business_name: text("business_name").notNull(),
    business_type: text("business_type").notNull(),
    created_at: text("created_at").default(nowIso).notNull(),
    currency: text("currency").default("BDT").notNull(),
    customer_email: text("customer_email").notNull(),
    customer_name: text("customer_name").notNull(),
    customer_phone: text("customer_phone"),
    error_message: text("error_message"),
    external_order_id: text("external_order_id").notNull(),
    payment_method: text("payment_method"),
    plan_id: text("plan_id"),
    processed_at: text("processed_at"),
    raw_payload: text("raw_payload", { mode: "json" }),
    source: text("source").default("main_website").notNull(),
    status: text("status").default("pending").notNull(),
    tenant_id: text("tenant_id"),
    transaction_id: text("transaction_id"),
    updated_at: text("updated_at").default(nowIso).notNull(),
    user_id: text("user_id"),
  },
  (t) => ({
    externalOrderUnq: uniqueIndex("external_sales_orders_external_order_unq").on(t.external_order_id, t.source),
  }),
);

// --- Team / Permissions ----------------------------------------------------
export const teamMemberPermissions = sqliteTable(
  "team_member_permissions",
  {
    id: uid(),
    can_access_ai_agent: integer("can_access_ai_agent", { mode: "boolean" }).default(false),
    can_access_analytics: integer("can_access_analytics", { mode: "boolean" }).default(false),
    can_access_automation: integer("can_access_automation", { mode: "boolean" }).default(false),
    can_access_accounts: integer("can_access_accounts", { mode: "boolean" }).default(false),
    can_access_complaints: integer("can_access_complaints", { mode: "boolean" }).default(true),
    can_access_contacts: integer("can_access_contacts", { mode: "boolean" }).default(true),
    can_access_fb_inbox: integer("can_access_fb_inbox", { mode: "boolean" }).default(false),
    can_access_groups: integer("can_access_groups", { mode: "boolean" }).default(false),
    can_access_inbox: integer("can_access_inbox", { mode: "boolean" }).default(true),
    can_access_internal_chat: integer("can_access_internal_chat", { mode: "boolean" }).default(true),
    can_access_orders: integer("can_access_orders", { mode: "boolean" }).default(true),
    can_access_products: integer("can_access_products", { mode: "boolean" }).default(false),
    can_access_reports: integer("can_access_reports", { mode: "boolean" }).default(false),
    can_access_settings: integer("can_access_settings", { mode: "boolean" }).default(false),
    can_access_team: integer("can_access_team", { mode: "boolean" }).default(false),
    can_access_workflows: integer("can_access_workflows", { mode: "boolean" }).default(false),
    can_assign_contacts: integer("can_assign_contacts", { mode: "boolean" }).default(false),
    can_create_contacts: integer("can_create_contacts", { mode: "boolean" }).default(true),
    can_create_orders: integer("can_create_orders", { mode: "boolean" }).default(true),
    can_create_products: integer("can_create_products", { mode: "boolean" }).default(false),
    can_delete_contacts: integer("can_delete_contacts", { mode: "boolean" }).default(false),
    can_delete_messages: integer("can_delete_messages", { mode: "boolean" }).default(false),
    can_delete_orders: integer("can_delete_orders", { mode: "boolean" }).default(false),
    can_delete_products: integer("can_delete_products", { mode: "boolean" }).default(false),
    can_edit_contacts: integer("can_edit_contacts", { mode: "boolean" }).default(true),
    can_edit_orders: integer("can_edit_orders", { mode: "boolean" }).default(false),
    can_edit_products: integer("can_edit_products", { mode: "boolean" }).default(false),
    can_export_data: integer("can_export_data", { mode: "boolean" }).default(false),
    can_send_bulk_messages: integer("can_send_bulk_messages", { mode: "boolean" }).default(false),
    can_send_messages: integer("can_send_messages", { mode: "boolean" }).default(true),
    can_update_order_status: integer("can_update_order_status", { mode: "boolean" }).default(true),
    can_update_payment_status: integer("can_update_payment_status", { mode: "boolean" }).default(false),
    can_view_revenue: integer("can_view_revenue", { mode: "boolean" }).default(false),
    created_at: text("created_at").default(nowIso),
    tenant_id: text("tenant_id").notNull(),
    updated_at: text("updated_at").default(nowIso),
    user_id: text("user_id").notNull(),
  },
  (t) => ({
    tenantUserUnq: uniqueIndex("team_member_permissions_tenant_user_unq").on(t.tenant_id, t.user_id),
  }),
);

export const teamMemberAccess = sqliteTable(
  "team_member_access",
  {
    id: uid(),
    created_at: text("created_at").default(nowIso),
    resource_id: text("resource_id").notNull(),
    resource_type: text("resource_type").notNull(),
    tenant_id: text("tenant_id").notNull(),
    user_id: text("user_id").notNull(),
  },
  (t) => ({
    tenantIdx: index("team_member_access_tenant_id_idx").on(t.tenant_id),
    unq: uniqueIndex("team_member_access_unq").on(t.tenant_id, t.user_id, t.resource_type, t.resource_id),
  }),
);

export const teamInvitations = sqliteTable(
  "team_invitations",
  {
    id: uid(),
    accepted_at: text("accepted_at"),
    created_at: text("created_at").default(nowIso).notNull(),
    email: text("email").notNull(),
    expires_at: text("expires_at").notNull(),
    invited_by: text("invited_by").notNull(),
    role: text("role").default("agent").notNull(),
    tenant_id: text("tenant_id").notNull(),
    token: text("token").notNull(),
  },
  (t) => ({
    tenantIdx: index("team_invitations_tenant_id_idx").on(t.tenant_id),
    tokenUnq: uniqueIndex("team_invitations_token_unq").on(t.token),
    tenantEmailUnq: uniqueIndex("team_invitations_tenant_email_unq").on(t.tenant_id, t.email),
  }),
);

export const teamActivityLogs = sqliteTable(
  "team_activity_logs",
  {
    id: uid(),
    activity_type: text("activity_type").notNull(),
    created_at: text("created_at").default(nowIso).notNull(),
    entity_id: text("entity_id"),
    entity_type: text("entity_type"),
    metadata: text("metadata", { mode: "json" }),
    tenant_id: text("tenant_id").notNull(),
    user_id: text("user_id").notNull(),
  },
  (t) => ({
    tenantIdx: index("team_activity_logs_tenant_id_idx").on(t.tenant_id),
  }),
);

export const teamKpiTargets = sqliteTable(
  "team_kpi_targets",
  {
    id: uid(),
    created_at: text("created_at").default(nowIso).notNull(),
    is_active: integer("is_active", { mode: "boolean" }).default(true).notNull(),
    metric: text("metric").notNull(),
    period: text("period").default("daily").notNull(),
    target_value: real("target_value").notNull(),
    tenant_id: text("tenant_id").notNull(),
    updated_at: text("updated_at").default(nowIso).notNull(),
    user_id: text("user_id"),
  },
  (t) => ({
    tenantIdx: index("team_kpi_targets_tenant_id_idx").on(t.tenant_id),
  }),
);

export const teamPresenceLogs = sqliteTable(
  "team_presence_logs",
  {
    id: uid(),
    current_page: text("current_page"),
    date: text("date").notNull(),
    day_of_week: integer("day_of_week").notNull(),
    hour_of_day: integer("hour_of_day").notNull(),
    recorded_at: text("recorded_at").default(nowIso).notNull(),
    status: text("status").notNull(),
    tenant_id: text("tenant_id").notNull(),
    user_id: text("user_id").notNull(),
  },
  (t) => ({
    tenantIdx: index("team_presence_logs_tenant_id_idx").on(t.tenant_id),
  }),
);

export const teamWorkSessions = sqliteTable(
  "team_work_sessions",
  {
    id: uid(),
    break_count: integer("break_count").default(0),
    conversations_handled: integer("conversations_handled").default(0),
    created_at: text("created_at").default(nowIso),
    first_seen_at: text("first_seen_at"),
    last_seen_at: text("last_seen_at"),
    longest_session_minutes: integer("longest_session_minutes").default(0),
    messages_received: integer("messages_received").default(0),
    messages_sent: integer("messages_sent").default(0),
    page_activity: text("page_activity", { mode: "json" }),
    session_date: text("session_date").notNull(),
    tenant_id: text("tenant_id").notNull(),
    total_active_minutes: integer("total_active_minutes").default(0),
    total_away_minutes: integer("total_away_minutes").default(0),
    updated_at: text("updated_at").default(nowIso),
    user_id: text("user_id").notNull(),
  },
  (t) => ({
    sessionUnq: uniqueIndex("team_work_sessions_unq").on(t.tenant_id, t.user_id, t.session_date),
  }),
);

export const userPresence = sqliteTable("user_presence", {
  user_id: text("user_id").primaryKey(),
  is_typing_in: text("is_typing_in"),
  last_seen_at: text("last_seen_at").default(nowIso).notNull(),
  status: text("status").default("offline").notNull(),
  tenant_id: text("tenant_id").notNull(),
});

export const permissionTemplates = sqliteTable(
  "permission_templates",
  {
    id: uid(),
    created_at: text("created_at").default(nowIso),
    description: text("description"),
    is_system: integer("is_system", { mode: "boolean" }).default(false),
    name: text("name").notNull(),
    permissions: text("permissions", { mode: "json" }).notNull(),
    tenant_id: text("tenant_id"),
  },
  (t) => ({
    tenantIdx: index("permission_templates_tenant_id_idx").on(t.tenant_id),
  }),
);

// --- Catalog reference (global, read-only via API) -------------------------
export const businessTypes = sqliteTable("business_types", {
  id: uid(),
  color: text("color"),
  created_at: text("created_at").default(nowIso),
  description: text("description"),
  display_order: integer("display_order").default(0),
  icon: text("icon"),
  is_active: integer("is_active", { mode: "boolean" }).default(true),
  name: text("name").notNull(),
  name_bn: text("name_bn"),
  slug: text("slug").notNull(),
  updated_at: text("updated_at").default(nowIso),
});

export const businessTypeFeatures = sqliteTable(
  "business_type_features",
  {
    id: uid(),
    business_type_id: text("business_type_id"),
    created_at: text("created_at").default(nowIso),
    display_order: integer("display_order").default(0),
    feature_description: text("feature_description"),
    feature_key: text("feature_key").notNull(),
    feature_label: text("feature_label").notNull(),
    feature_label_bn: text("feature_label_bn"),
    icon: text("icon"),
    is_core: integer("is_core", { mode: "boolean" }).default(true),
    min_tier: text("min_tier").default("starter"),
  },
  (t) => ({
    typeIdx: index("business_type_features_type_idx").on(t.business_type_id),
  }),
);

export const featureCategories = sqliteTable("feature_categories", {
  id: uid(),
  created_at: text("created_at").default(nowIso),
  display_order: integer("display_order").default(0),
  icon: text("icon"),
  name: text("name").notNull(),
  name_bn: text("name_bn"),
});

export const systemSettings = sqliteTable("system_settings", {
  id: uid(),
  created_at: text("created_at").default(nowIso).notNull(),
  description: text("description"),
  key: text("key").notNull(),
  updated_at: text("updated_at").default(nowIso).notNull(),
  value: text("value", { mode: "json" }),
});

// --- Admin -----------------------------------------------------------------
export const adminAccessRequests = sqliteTable(
  "admin_access_requests",
  {
    id: uid(),
    created_at: text("created_at").default(nowIso).notNull(),
    permissions: text("permissions", { mode: "json" }),
    reason: text("reason"),
    requested_by: text("requested_by").notNull(),
    review_notes: text("review_notes"),
    reviewed_at: text("reviewed_at"),
    reviewed_by: text("reviewed_by"),
    status: text("status").default("pending").notNull(),
    user_id: text("user_id").notNull(),
  },
  (t) => ({
    userIdx: index("admin_access_requests_user_id_idx").on(t.user_id),
  }),
);

export const adminTasks = sqliteTable("admin_tasks", {
  id: uid(),
  assigned_by: text("assigned_by"),
  assigned_to: text("assigned_to"),
  completed_at: text("completed_at"),
  created_at: text("created_at").default(nowIso),
  description: text("description"),
  due_date: text("due_date"),
  priority: text("priority").default("medium"),
  related_tenant_id: text("related_tenant_id"),
  related_ticket_id: text("related_ticket_id"),
  status: text("status").default("todo"),
  title: text("title").notNull(),
  updated_at: text("updated_at").default(nowIso),
});

export const adminNotifications = sqliteTable("admin_notifications", {
  id: uid(),
  created_at: text("created_at").default(nowIso),
  entity_id: text("entity_id"),
  entity_type: text("entity_type"),
  is_read: integer("is_read", { mode: "boolean" }).default(false),
  message: text("message"),
  metadata: text("metadata", { mode: "json" }),
  tenant_id: text("tenant_id"),
  title: text("title").notNull(),
  type: text("type").notNull(),
});

export const inAppNotifications = sqliteTable(
  "in_app_notifications",
  {
    id: uid(),
    created_at: text("created_at").default(nowIso),
    entity_id: text("entity_id"),
    entity_type: text("entity_type"),
    is_read: integer("is_read", { mode: "boolean" }).default(false),
    message: text("message"),
    metadata: text("metadata", { mode: "json" }),
    read_at: text("read_at"),
    tenant_id: text("tenant_id").notNull(),
    title: text("title").notNull(),
    type: text("type").notNull(),
    user_id: text("user_id"),
  },
  (t) => ({
    tenantIdx: index("in_app_notifications_tenant_id_idx").on(t.tenant_id),
  }),
);

export const supportTickets = sqliteTable(
  "support_tickets",
  {
    id: uid(),
    assigned_to: text("assigned_to"),
    category: text("category").default("general"),
    created_at: text("created_at").default(nowIso),
    description: text("description"),
    priority: text("priority").default("medium"),
    resolved_at: text("resolved_at"),
    resolved_by: text("resolved_by"),
    status: text("status").default("open"),
    subject: text("subject").notNull(),
    tenant_id: text("tenant_id"),
    ticket_number: text("ticket_number").notNull(),
    updated_at: text("updated_at").default(nowIso),
    user_id: text("user_id"),
  },
  (t) => ({
    tenantIdx: index("support_tickets_tenant_id_idx").on(t.tenant_id),
    ticketNumberUnq: uniqueIndex("support_tickets_ticket_number_unq").on(t.ticket_number),
  }),
);

export const supportTicketMessages = sqliteTable(
  "support_ticket_messages",
  {
    id: uid(),
    attachments: text("attachments", { mode: "json" }),
    created_at: text("created_at").default(nowIso),
    is_internal_note: integer("is_internal_note", { mode: "boolean" }).default(false),
    message: text("message").notNull(),
    sender_id: text("sender_id"),
    sender_type: text("sender_type").notNull(),
    ticket_id: text("ticket_id").notNull(),
  },
  (t) => ({
    ticketIdx: index("support_ticket_messages_ticket_id_idx").on(t.ticket_id),
  }),
);

// --- Accounting (deferred-v1; read-only pages may load these) ---------------
export const expenseCategories = sqliteTable("expense_categories", {
  id: uid(),
  color: text("color").default("gray"),
  created_at: text("created_at").default(nowIso),
  description: text("description"),
  icon: text("icon"),
  is_active: integer("is_active", { mode: "boolean" }).default(true),
  name: text("name").notNull(),
  updated_at: text("updated_at").default(nowIso),
});

export const expenses = sqliteTable("expenses", {
  id: uid(),
  amount: real("amount").notNull(),
  attachment_url: text("attachment_url"),
  category_id: text("category_id"),
  created_at: text("created_at").default(nowIso),
  currency: text("currency").default("BDT"),
  description: text("description").notNull(),
  expense_date: text("expense_date").notNull(),
  notes: text("notes"),
  payment_method: text("payment_method"),
  recorded_by: text("recorded_by"),
  reference_number: text("reference_number"),
  updated_at: text("updated_at").default(nowIso),
  vendor_name: text("vendor_name"),
});

export const recurringExpenses = sqliteTable("recurring_expenses", {
  id: uid(),
  amount: real("amount").notNull(),
  category_id: text("category_id"),
  created_at: text("created_at").default(nowIso),
  currency: text("currency").default("BDT"),
  day_of_month: integer("day_of_month").default(1),
  description: text("description").notNull(),
  frequency: text("frequency").default("monthly").notNull(),
  is_active: integer("is_active", { mode: "boolean" }).default(true),
  last_generated_at: text("last_generated_at"),
  next_due_date: text("next_due_date").notNull(),
  notes: text("notes"),
  payment_method: text("payment_method"),
  updated_at: text("updated_at").default(nowIso),
  vendor_name: text("vendor_name"),
});

export const tenantExpenseCategories = sqliteTable(
  "tenant_expense_categories",
  {
    id: uid(),
    color: text("color").default("gray"),
    created_at: text("created_at").default(nowIso),
    description: text("description"),
    icon: text("icon").default("MoreHorizontal"),
    is_active: integer("is_active", { mode: "boolean" }).default(true),
    name: text("name").notNull(),
    tenant_id: text("tenant_id").notNull(),
    updated_at: text("updated_at").default(nowIso),
  },
  (t) => ({
    tenantIdx: index("tenant_expense_categories_tenant_id_idx").on(t.tenant_id),
    tenantNameUnq: uniqueIndex("tenant_expense_categories_tenant_name_unq").on(t.tenant_id, t.name),
  }),
);

export const tenantExpenses = sqliteTable(
  "tenant_expenses",
  {
    id: uid(),
    amount: real("amount").notNull(),
    attachment_url: text("attachment_url"),
    category_id: text("category_id"),
    created_at: text("created_at").default(nowIso),
    currency: text("currency").default("BDT"),
    description: text("description").notNull(),
    expense_date: text("expense_date").notNull(),
    notes: text("notes"),
    payment_method: text("payment_method"),
    recorded_by: text("recorded_by"),
    reference_number: text("reference_number"),
    tenant_id: text("tenant_id").notNull(),
    updated_at: text("updated_at").default(nowIso),
    vendor_name: text("vendor_name"),
  },
  (t) => ({
    tenantIdx: index("tenant_expenses_tenant_id_idx").on(t.tenant_id),
  }),
);

export const tenantRecurringExpenses = sqliteTable(
  "tenant_recurring_expenses",
  {
    id: uid(),
    amount: real("amount").notNull(),
    category_id: text("category_id"),
    created_at: text("created_at").default(nowIso),
    currency: text("currency").default("BDT"),
    day_of_month: integer("day_of_month"),
    description: text("description").notNull(),
    frequency: text("frequency").notNull(),
    is_active: integer("is_active", { mode: "boolean" }).default(true),
    last_generated_at: text("last_generated_at"),
    next_due_date: text("next_due_date"),
    notes: text("notes"),
    payment_method: text("payment_method"),
    tenant_id: text("tenant_id").notNull(),
    updated_at: text("updated_at").default(nowIso),
    vendor_name: text("vendor_name"),
  },
  (t) => ({
    tenantIdx: index("tenant_recurring_expenses_tenant_id_idx").on(t.tenant_id),
  }),
);

// --- Reports / Reminders / Onboarding --------------------------------------
export const scheduledReportSettings = sqliteTable(
  "scheduled_report_settings",
  {
    id: uid(),
    created_at: text("created_at").default(nowIso).notNull(),
    daily_enabled: integer("daily_enabled", { mode: "boolean" }).default(true).notNull(),
    monthly_enabled: integer("monthly_enabled", { mode: "boolean" }).default(true).notNull(),
    send_time: text("send_time").default("20:00:00").notNull(),
    tenant_id: text("tenant_id").notNull(),
    timezone: text("timezone").default("Asia/Dhaka").notNull(),
    updated_at: text("updated_at").default(nowIso).notNull(),
    weekly_enabled: integer("weekly_enabled", { mode: "boolean" }).default(true).notNull(),
  },
  (t) => ({
    tenantUnq: uniqueIndex("scheduled_report_settings_tenant_unq").on(t.tenant_id),
  }),
);

export const scheduledReportLogs = sqliteTable(
  "scheduled_report_logs",
  {
    id: uid(),
    created_at: text("created_at").default(nowIso).notNull(),
    error_message: text("error_message"),
    report_data: text("report_data", { mode: "json" }),
    report_type: text("report_type").notNull(),
    sent_at: text("sent_at"),
    status: text("status").default("pending").notNull(),
    tenant_id: text("tenant_id").notNull(),
  },
  (t) => ({
    tenantIdx: index("scheduled_report_logs_tenant_id_idx").on(t.tenant_id),
  }),
);

export const reminderSettings = sqliteTable("reminder_settings", {
  id: uid(),
  channel: text("channel").default("both").notNull(),
  created_at: text("created_at").default(nowIso),
  days_offset: text("days_offset", { mode: "json" }).notNull(),
  email_subject: text("email_subject"),
  is_active: integer("is_active", { mode: "boolean" }).default(true),
  reminder_type: text("reminder_type").notNull(),
  template_id: text("template_id"),
  updated_at: text("updated_at").default(nowIso),
});

export const reminderLogs = sqliteTable(
  "reminder_logs",
  {
    id: uid(),
    channel: text("channel").notNull(),
    error_message: text("error_message"),
    reminder_type: text("reminder_type").notNull(),
    sent_at: text("sent_at").default(nowIso),
    status: text("status").default("pending").notNull(),
    subscription_id: text("subscription_id"),
    tenant_id: text("tenant_id"),
  },
  (t) => ({
    tenantIdx: index("reminder_logs_tenant_id_idx").on(t.tenant_id),
  }),
);

export const onboardingJobs = sqliteTable(
  "onboarding_jobs",
  {
    id: uid(),
    created_at: text("created_at").default(nowIso).notNull(),
    error_message: text("error_message"),
    instance_id: text("instance_id"),
    metadata: text("metadata", { mode: "json" }),
    next_retry_at: text("next_retry_at"),
    retry_count: integer("retry_count").default(0).notNull(),
    status: text("status").default("pending").notNull(),
    step: text("step"),
    tenant_id: text("tenant_id").notNull(),
    updated_at: text("updated_at").default(nowIso).notNull(),
  },
  (t) => ({
    tenantIdx: index("onboarding_jobs_tenant_id_idx").on(t.tenant_id),
  }),
);

// --- Marketing (deferred-v1; admin pages read these) -----------------------
export const marketingLeads = sqliteTable("marketing_leads", {
  id: uid(),
  business_name: text("business_name").notNull(),
  created_at: text("created_at").default(nowIso),
  demo_access_count: integer("demo_access_count").default(0),
  demo_accessed_at: text("demo_accessed_at"),
  email: text("email").notNull(),
  full_name: text("full_name").notNull(),
  notes: text("notes"),
  source: text("source").default("demo_request"),
  status: text("status").default("warm"),
  updated_at: text("updated_at").default(nowIso),
  whatsapp_number: text("whatsapp_number").notNull(),
});

export const adminMarketingCampaigns = sqliteTable("admin_marketing_campaigns", {
  id: uid(),
  alternate_channels: integer("alternate_channels", { mode: "boolean" }).default(true),
  blackout_hours: text("blackout_hours", { mode: "json" }),
  created_at: text("created_at").default(nowIso),
  created_by: text("created_by"),
  frequency_per_month: integer("frequency_per_month").default(4),
  frequency_per_week: integer("frequency_per_week").default(1),
  max_discount_percent: integer("max_discount_percent").default(10),
  min_days_between_messages: integer("min_days_between_messages").default(2),
  name: text("name").notNull(),
  name_bn: text("name_bn"),
  status: text("status").default("draft"),
  target_audience: text("target_audience", { mode: "json" }),
  target_tier: text("target_tier", { mode: "json" }),
  type: text("type").notNull(),
  updated_at: text("updated_at").default(nowIso),
  use_email: integer("use_email", { mode: "boolean" }).default(true),
  use_whatsapp: integer("use_whatsapp", { mode: "boolean" }).default(true),
});

export const adminMarketingSequences = sqliteTable("admin_marketing_sequences", {
  id: uid(),
  ai_personalize: integer("ai_personalize", { mode: "boolean" }).default(false),
  campaign_id: text("campaign_id").notNull(),
  channel: text("channel").notNull(),
  content_template: text("content_template", { mode: "json" }).notNull(),
  created_at: text("created_at").default(nowIso),
  day_of_week: integer("day_of_week"),
  discount_percent: integer("discount_percent").default(0),
  is_active: integer("is_active", { mode: "boolean" }).default(true),
  name: text("name").notNull(),
  name_bn: text("name_bn"),
  step_order: integer("step_order").notNull(),
  theme: text("theme"),
  week_number: integer("week_number").notNull(),
});

export const adminMarketingEnrollments = sqliteTable("admin_marketing_enrollments", {
  id: uid(),
  campaign_id: text("campaign_id").notNull(),
  completed_at: text("completed_at"),
  current_step: integer("current_step").default(0),
  current_week: integer("current_week").default(1),
  enrolled_at: text("enrolled_at").default(nowIso),
  entity_id: text("entity_id").notNull(),
  entity_type: text("entity_type").notNull(),
  last_message_at: text("last_message_at"),
  messages_this_month: integer("messages_this_month").default(0),
  messages_this_week: integer("messages_this_week").default(0),
  metadata: text("metadata", { mode: "json" }),
  month_reset_at: text("month_reset_at").default(nowIso),
  next_message_at: text("next_message_at"),
  status: text("status").default("active"),
  total_messages_sent: integer("total_messages_sent").default(0),
  unsubscribed_at: text("unsubscribed_at"),
  week_reset_at: text("week_reset_at").default(nowIso),
});

export const adminMarketingSends = sqliteTable("admin_marketing_sends", {
  id: uid(),
  ai_generated: integer("ai_generated", { mode: "boolean" }).default(false),
  channel: text("channel").notNull(),
  clicked_at: text("clicked_at"),
  content: text("content", { mode: "json" }),
  created_at: text("created_at").default(nowIso),
  delivered_at: text("delivered_at"),
  enrollment_id: text("enrollment_id").notNull(),
  error_message: text("error_message"),
  opened_at: text("opened_at"),
  sent_at: text("sent_at"),
  sequence_id: text("sequence_id").notNull(),
  status: text("status").default("pending"),
});

export const adminCustomerJourney = sqliteTable("admin_customer_journey", {
  id: uid(),
  channel: text("channel"),
  created_at: text("created_at").default(nowIso),
  description_bn: text("description_bn"),
  entity_id: text("entity_id").notNull(),
  entity_type: text("entity_type").notNull(),
  event_category: text("event_category"),
  event_type: text("event_type").notNull(),
  metadata: text("metadata", { mode: "json" }),
  title_bn: text("title_bn").notNull(),
});

// --- WooCommerce (deferred-v1; settings page reads integration row) --------
export const woocommerceIntegrations = sqliteTable(
  "woocommerce_integrations",
  {
    id: uid(),
    consumer_key_encrypted: text("consumer_key_encrypted").notNull(),
    consumer_secret_encrypted: text("consumer_secret_encrypted").notNull(),
    created_at: text("created_at").default(nowIso).notNull(),
    is_active: integer("is_active", { mode: "boolean" }).default(true),
    last_sync_at: text("last_sync_at"),
    settings: text("settings", { mode: "json" }),
    store_url: text("store_url").notNull(),
    sync_error: text("sync_error"),
    sync_status: text("sync_status").default("idle"),
    tenant_id: text("tenant_id").notNull(),
    updated_at: text("updated_at").default(nowIso).notNull(),
  },
  (t) => ({
    tenantUnq: uniqueIndex("woocommerce_integrations_tenant_unq").on(t.tenant_id),
  }),
);

export const woocommerceSyncLogs = sqliteTable(
  "woocommerce_sync_logs",
  {
    id: uid(),
    categories_synced: integer("categories_synced").default(0),
    completed_at: text("completed_at"),
    errors: text("errors", { mode: "json" }),
    integration_id: text("integration_id").notNull(),
    products_synced: integer("products_synced").default(0),
    started_at: text("started_at").default(nowIso).notNull(),
    status: text("status").notNull(),
    sync_type: text("sync_type").notNull(),
  },
  (t) => ({
    integrationIdx: index("woocommerce_sync_logs_integration_id_idx").on(t.integration_id),
  }),
);

// --- Internal Chat (deferred-v1; read-only) --------------------------------
export const internalChatRooms = sqliteTable(
  "internal_chat_rooms",
  {
    id: uid(),
    created_at: text("created_at").default(nowIso).notNull(),
    created_by: text("created_by"),
    name: text("name"),
    tenant_id: text("tenant_id").notNull(),
    type: text("type").default("direct").notNull(),
    updated_at: text("updated_at").default(nowIso).notNull(),
  },
  (t) => ({
    tenantIdx: index("internal_chat_rooms_tenant_id_idx").on(t.tenant_id),
  }),
);

export const internalChatMembers = sqliteTable(
  "internal_chat_members",
  {
    id: uid(),
    is_admin: integer("is_admin", { mode: "boolean" }).default(false).notNull(),
    joined_at: text("joined_at").default(nowIso).notNull(),
    last_read_at: text("last_read_at").default(nowIso),
    room_id: text("room_id").notNull(),
    user_id: text("user_id").notNull(),
  },
  (t) => ({
    roomUserUnq: uniqueIndex("internal_chat_members_room_user_unq").on(t.room_id, t.user_id),
  }),
);

export const internalMessages = sqliteTable(
  "internal_messages",
  {
    id: uid(),
    content: text("content"),
    content_type: text("content_type").default("text").notNull(),
    created_at: text("created_at").default(nowIso).notNull(),
    edited_at: text("edited_at"),
    is_deleted: integer("is_deleted", { mode: "boolean" }).default(false).notNull(),
    media_filename: text("media_filename"),
    media_url: text("media_url"),
    mentions: text("mentions", { mode: "json" }),
    reply_to_id: text("reply_to_id"),
    room_id: text("room_id").notNull(),
    sender_id: text("sender_id").notNull(),
  },
  (t) => ({
    roomIdx: index("internal_messages_room_id_idx").on(t.room_id),
  }),
);

// --- Service Boards (deferred-v1; read-only) -------------------------------
export const serviceBoards = sqliteTable(
  "service_boards",
  {
    id: uid(),
    archived_at: text("archived_at"),
    created_at: text("created_at").default(nowIso).notNull(),
    created_by: text("created_by").notNull(),
    description: text("description"),
    name: text("name").notNull(),
    tenant_id: text("tenant_id").notNull(),
    updated_at: text("updated_at").default(nowIso).notNull(),
  },
  (t) => ({
    tenantIdx: index("service_boards_tenant_id_idx").on(t.tenant_id),
  }),
);

export const serviceBoardMembers = sqliteTable(
  "service_board_members",
  {
    id: uid(),
    board_id: text("board_id").notNull(),
    joined_at: text("joined_at").default(nowIso).notNull(),
    role: text("role").default("member").notNull(),
    tenant_id: text("tenant_id").notNull(),
    user_id: text("user_id").notNull(),
  },
  (t) => ({
    tenantIdx: index("service_board_members_tenant_id_idx").on(t.tenant_id),
    boardUserUnq: uniqueIndex("service_board_members_board_user_unq").on(t.board_id, t.user_id),
  }),
);

export const serviceLists = sqliteTable(
  "service_lists",
  {
    id: uid(),
    board_id: text("board_id").notNull(),
    created_at: text("created_at").default(nowIso).notNull(),
    is_archived: integer("is_archived", { mode: "boolean" }).default(false).notNull(),
    name: text("name").notNull(),
    position_numeric: real("position_numeric").default(0).notNull(),
    tenant_id: text("tenant_id").notNull(),
    updated_at: text("updated_at").default(nowIso).notNull(),
  },
  (t) => ({
    tenantIdx: index("service_lists_tenant_id_idx").on(t.tenant_id),
  }),
);

export const serviceCards = sqliteTable(
  "service_cards",
  {
    id: uid(),
    archived_at: text("archived_at"),
    assigned_to: text("assigned_to"),
    board_id: text("board_id").notNull(),
    created_at: text("created_at").default(nowIso).notNull(),
    created_by: text("created_by").notNull(),
    description: text("description"),
    due_date: text("due_date"),
    list_id: text("list_id").notNull(),
    position_numeric: real("position_numeric").default(0).notNull(),
    priority: text("priority").default("medium"),
    status: text("status").default("open"),
    tenant_id: text("tenant_id").notNull(),
    title: text("title").notNull(),
    updated_at: text("updated_at").default(nowIso).notNull(),
  },
  (t) => ({
    tenantIdx: index("service_cards_tenant_id_idx").on(t.tenant_id),
  }),
);

export const serviceLabels = sqliteTable(
  "service_labels",
  {
    id: uid(),
    board_id: text("board_id").notNull(),
    color: text("color").default("#6366f1").notNull(),
    created_at: text("created_at").default(nowIso).notNull(),
    name: text("name").notNull(),
    tenant_id: text("tenant_id").notNull(),
  },
  (t) => ({
    tenantIdx: index("service_labels_tenant_id_idx").on(t.tenant_id),
  }),
);

export const serviceCardActivity = sqliteTable(
  "service_card_activity",
  {
    id: uid(),
    card_id: text("card_id").notNull(),
    created_at: text("created_at").default(nowIso).notNull(),
    event_type: text("event_type").notNull(),
    from_value: text("from_value"),
    metadata_json: text("metadata_json", { mode: "json" }),
    tenant_id: text("tenant_id").notNull(),
    to_value: text("to_value"),
    user_id: text("user_id").notNull(),
  },
  (t) => ({
    cardIdx: index("service_card_activity_card_id_idx").on(t.card_id),
  }),
);

/** All Phase 3 module tables, merged into appSchema by db/schema.ts. */
export const moduleSchema = {
  labels,
  fbContactLabels,
  customerSegments,
  contactSegments,
  customerScores,
  customerScoringRules,
  customerJourneyEvents,
  purchaseBehaviorChecks,
  stockMovements,
  stockAlerts,
  orderStatusHistory,
  invoices,
  invoiceSettings,
  shipments,
  courierIntegrations,
  complaints,
  automationRules,
  whatsappAutoMessages,
  whatsappAutoMessageLog,
  whatsappFollowupQueue,
  workflows,
  workflowNodes,
  workflowEdges,
  workflowExecutions,
  whatsappGroups,
  whatsappGroupParticipants,
  groupAddQueue,
  tenantDailyGroupLimits,
  fbPosts,
  fbPostComments,
  subscriptionOrders,
  externalSalesOrders,
  teamMemberPermissions,
  teamMemberAccess,
  teamInvitations,
  teamActivityLogs,
  teamKpiTargets,
  teamPresenceLogs,
  teamWorkSessions,
  userPresence,
  permissionTemplates,
  businessTypes,
  businessTypeFeatures,
  featureCategories,
  systemSettings,
  adminAccessRequests,
  adminTasks,
  adminNotifications,
  inAppNotifications,
  supportTickets,
  supportTicketMessages,
  expenseCategories,
  expenses,
  recurringExpenses,
  tenantExpenseCategories,
  tenantExpenses,
  tenantRecurringExpenses,
  scheduledReportSettings,
  scheduledReportLogs,
  reminderSettings,
  reminderLogs,
  onboardingJobs,
  marketingLeads,
  adminMarketingCampaigns,
  adminMarketingSequences,
  adminMarketingEnrollments,
  adminMarketingSends,
  adminCustomerJourney,
  woocommerceIntegrations,
  woocommerceSyncLogs,
  internalChatRooms,
  internalChatMembers,
  internalMessages,
  serviceBoards,
  serviceBoardMembers,
  serviceLists,
  serviceCards,
  serviceLabels,
  serviceCardActivity,
};
