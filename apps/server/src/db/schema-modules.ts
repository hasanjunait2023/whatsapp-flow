import { sql } from "drizzle-orm";
import { pgTable, text, integer, doublePrecision, boolean, jsonb, index, uniqueIndex } from "drizzle-orm/pg-core";

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
 *   bool        -> boolean
 *   jsonb       -> jsonb
 *   text[]      -> jsonb
 *   numeric/money columns the UI does arithmetic on -> doublePrecision
 */

const nowIso = sql`to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`;
const uid = () => text("id").primaryKey().$defaultFn(() => crypto.randomUUID());

// --- Contacts / Segments / Labels ------------------------------------------
export const labels = pgTable(
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

export const fbContactLabels = pgTable(
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

export const customerSegments = pgTable(
  "customer_segments",
  {
    id: uid(),
    color: text("color").default("#3B82F6"),
    created_at: text("created_at").default(nowIso),
    description: text("description"),
    icon: text("icon").default("users"),
    is_active: boolean("is_active").default(true),
    is_auto: boolean("is_auto").default(false),
    name: text("name").notNull(),
    rules: jsonb("rules"),
    tenant_id: text("tenant_id").notNull(),
    updated_at: text("updated_at").default(nowIso),
  },
  (t) => ({
    tenantIdx: index("customer_segments_tenant_id_idx").on(t.tenant_id),
    tenantNameUnq: uniqueIndex("customer_segments_tenant_name_unq").on(t.tenant_id, t.name),
  }),
);

export const contactSegments = pgTable(
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

export const customerScores = pgTable(
  "customer_scores",
  {
    id: uid(),
    avg_order_value: doublePrecision("avg_order_value").default(0),
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
    total_spent: doublePrecision("total_spent").default(0),
    updated_at: text("updated_at").default(nowIso),
  },
  (t) => ({
    tenantIdx: index("customer_scores_tenant_id_idx").on(t.tenant_id),
    contactUnq: uniqueIndex("customer_scores_contact_unq").on(t.contact_id),
  }),
);

export const customerScoringRules = pgTable(
  "customer_scoring_rules",
  {
    id: uid(),
    created_at: text("created_at").default(nowIso),
    criteria_type: text("criteria_type").notNull(),
    description: text("description"),
    is_active: boolean("is_active").default(true),
    name: text("name").notNull(),
    operator: text("operator").notNull(),
    points: integer("points").default(0).notNull(),
    tenant_id: text("tenant_id").notNull(),
    value_max: doublePrecision("value_max"),
    value_min: doublePrecision("value_min"),
  },
  (t) => ({
    tenantIdx: index("customer_scoring_rules_tenant_id_idx").on(t.tenant_id),
  }),
);

export const customerJourneyEvents = pgTable(
  "customer_journey_events",
  {
    id: uid(),
    contact_id: text("contact_id").notNull(),
    created_at: text("created_at").default(nowIso).notNull(),
    created_by: text("created_by"),
    description: text("description"),
    event_category: text("event_category").notNull(),
    event_type: text("event_type").notNull(),
    metadata: jsonb("metadata"),
    tenant_id: text("tenant_id").notNull(),
    title: text("title").notNull(),
  },
  (t) => ({
    tenantIdx: index("customer_journey_events_tenant_id_idx").on(t.tenant_id),
    contactIdx: index("customer_journey_events_contact_id_idx").on(t.contact_id),
  }),
);

export const purchaseBehaviorChecks = pgTable(
  "purchase_behavior_checks",
  {
    id: uid(),
    cancelled_deliveries: integer("cancelled_deliveries").default(0),
    checked_at: text("checked_at").default(nowIso),
    checked_by: text("checked_by"),
    contact_id: text("contact_id"),
    courier_stats: jsonb("courier_stats"),
    created_at: text("created_at").default(nowIso),
    customer_rating: doublePrecision("customer_rating"),
    phone_number: text("phone_number").notNull(),
    raw_response: jsonb("raw_response"),
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
export const stockMovements = pgTable(
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

export const stockAlerts = pgTable(
  "stock_alerts",
  {
    id: uid(),
    alert_type: text("alert_type").notNull(),
    created_at: text("created_at").default(nowIso).notNull(),
    is_active: boolean("is_active").default(true),
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

export const orderStatusHistory = pgTable(
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
export const invoices = pgTable(
  "invoices",
  {
    id: uid(),
    created_at: text("created_at").default(nowIso),
    invoice_number: text("invoice_number").notNull(),
    order_id: text("order_id"),
    pdf_url: text("pdf_url"),
    sent_at: text("sent_at"),
    sent_via_whatsapp: boolean("sent_via_whatsapp").default(false),
    tenant_id: text("tenant_id").notNull(),
    total: doublePrecision("total"),
  },
  (t) => ({
    tenantIdx: index("invoices_tenant_id_idx").on(t.tenant_id),
  }),
);

export const invoiceSettings = pgTable(
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

export const shipments = pgTable(
  "shipments",
  {
    id: uid(),
    booked_at: text("booked_at"),
    cod_amount: doublePrecision("cod_amount"),
    consignment_id: text("consignment_id"),
    courier: text("courier").notNull(),
    courier_response: jsonb("courier_response"),
    created_at: text("created_at").default(nowIso),
    delivered_at: text("delivered_at"),
    delivery_address: jsonb("delivery_address"),
    delivery_fee: doublePrecision("delivery_fee"),
    item_description: text("item_description"),
    order_id: text("order_id").notNull(),
    pickup_address: jsonb("pickup_address"),
    special_instructions: text("special_instructions"),
    status: text("status").default("pending"),
    tenant_id: text("tenant_id").notNull(),
    tracking_code: text("tracking_code"),
    updated_at: text("updated_at").default(nowIso),
    weight_kg: doublePrecision("weight_kg"),
  },
  (t) => ({
    tenantIdx: index("shipments_tenant_id_idx").on(t.tenant_id),
    orderIdx: index("shipments_order_id_idx").on(t.order_id),
  }),
);

export const courierIntegrations = pgTable(
  "courier_integrations",
  {
    id: uid(),
    api_key: text("api_key"),
    api_secret: text("api_secret"),
    created_at: text("created_at").default(nowIso),
    default_pickup_address: jsonb("default_pickup_address"),
    is_active: boolean("is_active").default(true),
    provider: text("provider").notNull(),
    settings: jsonb("settings"),
    store_id: text("store_id"),
    tenant_id: text("tenant_id").notNull(),
    updated_at: text("updated_at").default(nowIso),
  },
  (t) => ({
    tenantIdx: index("courier_integrations_tenant_id_idx").on(t.tenant_id),
    tenantProviderUnq: uniqueIndex("courier_integrations_tenant_provider_unq").on(t.tenant_id, t.provider),
  }),
);

export const complaints = pgTable(
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
export const automationRules = pgTable(
  "automation_rules",
  {
    id: uid(),
    action_config: jsonb("action_config").notNull(),
    action_type: text("action_type").notNull(),
    created_at: text("created_at").default(nowIso).notNull(),
    description: text("description"),
    is_active: boolean("is_active").default(true).notNull(),
    name: text("name").notNull(),
    priority: integer("priority").default(0).notNull(),
    tenant_id: text("tenant_id").notNull(),
    trigger_config: jsonb("trigger_config").notNull(),
    trigger_type: text("trigger_type").notNull(),
    updated_at: text("updated_at").default(nowIso).notNull(),
  },
  (t) => ({
    tenantIdx: index("automation_rules_tenant_id_idx").on(t.tenant_id),
  }),
);

export const whatsappAutoMessages = pgTable(
  "whatsapp_auto_messages",
  {
    id: uid(),
    away_cooldown_hours: integer("away_cooldown_hours").default(24),
    away_enabled: boolean("away_enabled").default(false),
    away_media_items: jsonb("away_media_items"),
    away_message: text("away_message"),
    created_at: text("created_at").default(nowIso),
    followup_delay_hours: integer("followup_delay_hours").default(6),
    followup_enabled: boolean("followup_enabled").default(false),
    followup_media_items: jsonb("followup_media_items"),
    followup_message: text("followup_message"),
    tenant_id: text("tenant_id").notNull(),
    updated_at: text("updated_at").default(nowIso),
    welcome_enabled: boolean("welcome_enabled").default(false),
    welcome_media_items: jsonb("welcome_media_items"),
    welcome_message: text("welcome_message"),
  },
  (t) => ({
    tenantUnq: uniqueIndex("whatsapp_auto_messages_tenant_unq").on(t.tenant_id),
  }),
);

export const whatsappAutoMessageLog = pgTable(
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

export const whatsappFollowupQueue = pgTable(
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

export const workflows = pgTable(
  "workflows",
  {
    id: uid(),
    created_at: text("created_at").default(nowIso),
    created_by: text("created_by"),
    description: text("description"),
    is_active: boolean("is_active").default(false),
    name: text("name").notNull(),
    tenant_id: text("tenant_id").notNull(),
    trigger_config: jsonb("trigger_config"),
    trigger_type: text("trigger_type").notNull(),
    updated_at: text("updated_at").default(nowIso),
  },
  (t) => ({
    tenantIdx: index("workflows_tenant_id_idx").on(t.tenant_id),
  }),
);

export const workflowNodes = pgTable(
  "workflow_nodes",
  {
    id: uid(),
    created_at: text("created_at").default(nowIso),
    node_config: jsonb("node_config"),
    node_subtype: text("node_subtype"),
    node_type: text("node_type").notNull(),
    position_x: doublePrecision("position_x").default(0),
    position_y: doublePrecision("position_y").default(0),
    tenant_id: text("tenant_id"),
    workflow_id: text("workflow_id").notNull(),
  },
  (t) => ({
    workflowIdx: index("workflow_nodes_workflow_id_idx").on(t.workflow_id),
  }),
);

export const workflowEdges = pgTable(
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

export const workflowExecutions = pgTable(
  "workflow_executions",
  {
    id: uid(),
    completed_at: text("completed_at"),
    contact_id: text("contact_id"),
    error_message: text("error_message"),
    execution_data: jsonb("execution_data"),
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
export const whatsappGroups = pgTable(
  "whatsapp_groups",
  {
    id: uid(),
    created_at: text("created_at").default(nowIso),
    description: text("description"),
    instance_id: text("instance_id").notNull(),
    invite_link: text("invite_link"),
    is_admin: boolean("is_admin").default(true),
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

export const whatsappGroupParticipants = pgTable(
  "whatsapp_group_participants",
  {
    id: uid(),
    added_at: text("added_at").default(nowIso),
    added_by: text("added_by"),
    contact_id: text("contact_id"),
    group_id: text("group_id").notNull(),
    is_admin: boolean("is_admin").default(false),
    phone_number: text("phone_number").notNull(),
    tenant_id: text("tenant_id"),
  },
  (t) => ({
    groupIdx: index("whatsapp_group_participants_group_id_idx").on(t.group_id),
    groupPhoneUnq: uniqueIndex("whatsapp_group_participants_group_phone_unq").on(t.group_id, t.phone_number),
  }),
);

export const groupAddQueue = pgTable(
  "group_add_queue",
  {
    id: uid(),
    batch_size: integer("batch_size").default(5),
    completed_at: text("completed_at"),
    created_at: text("created_at").default(nowIso),
    created_by: text("created_by"),
    error_log: jsonb("error_log"),
    failed_count: integer("failed_count").default(0),
    group_id: text("group_id").notNull(),
    interval_minutes: integer("interval_minutes").default(30),
    phone_numbers: jsonb("phone_numbers").notNull(),
    processed_count: integer("processed_count").default(0),
    scheduled_for: text("scheduled_for").notNull(),
    status: text("status").default("pending"),
    tenant_id: text("tenant_id").notNull(),
  },
  (t) => ({
    tenantIdx: index("group_add_queue_tenant_id_idx").on(t.tenant_id),
  }),
);

export const tenantDailyGroupLimits = pgTable(
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
export const fbPosts = pgTable(
  "fb_posts",
  {
    id: uid(),
    comment_count: integer("comment_count").default(0),
    created_at: text("created_at").default(nowIso),
    created_time: text("created_time"),
    fb_post_id: text("fb_post_id").notNull(),
    full_picture: text("full_picture"),
    is_hidden: boolean("is_hidden").default(false),
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

export const fbPostComments = pgTable(
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
    is_from_page: boolean("is_from_page").default(false),
    is_hidden: boolean("is_hidden").default(false),
    is_read: boolean("is_read").default(false),
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
export const subscriptionOrders = pgTable(
  "subscription_orders",
  {
    id: uid(),
    amount: doublePrecision("amount").notNull(),
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

export const externalSalesOrders = pgTable(
  "external_sales_orders",
  {
    id: uid(),
    amount: doublePrecision("amount").notNull(),
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
    raw_payload: jsonb("raw_payload"),
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
export const teamMemberPermissions = pgTable(
  "team_member_permissions",
  {
    id: uid(),
    can_access_ai_agent: boolean("can_access_ai_agent").default(false),
    can_access_analytics: boolean("can_access_analytics").default(false),
    can_access_automation: boolean("can_access_automation").default(false),
    can_access_accounts: boolean("can_access_accounts").default(false),
    can_access_complaints: boolean("can_access_complaints").default(true),
    can_access_contacts: boolean("can_access_contacts").default(true),
    can_access_fb_inbox: boolean("can_access_fb_inbox").default(false),
    can_access_groups: boolean("can_access_groups").default(false),
    can_access_inbox: boolean("can_access_inbox").default(true),
    can_access_internal_chat: boolean("can_access_internal_chat").default(true),
    can_access_orders: boolean("can_access_orders").default(true),
    can_access_products: boolean("can_access_products").default(false),
    can_access_reports: boolean("can_access_reports").default(false),
    can_access_settings: boolean("can_access_settings").default(false),
    can_access_team: boolean("can_access_team").default(false),
    can_access_workflows: boolean("can_access_workflows").default(false),
    can_assign_contacts: boolean("can_assign_contacts").default(false),
    can_create_contacts: boolean("can_create_contacts").default(true),
    can_create_orders: boolean("can_create_orders").default(true),
    can_create_products: boolean("can_create_products").default(false),
    can_delete_contacts: boolean("can_delete_contacts").default(false),
    can_delete_messages: boolean("can_delete_messages").default(false),
    can_delete_orders: boolean("can_delete_orders").default(false),
    can_delete_products: boolean("can_delete_products").default(false),
    can_edit_contacts: boolean("can_edit_contacts").default(true),
    can_edit_orders: boolean("can_edit_orders").default(false),
    can_edit_products: boolean("can_edit_products").default(false),
    can_export_data: boolean("can_export_data").default(false),
    can_send_bulk_messages: boolean("can_send_bulk_messages").default(false),
    can_send_messages: boolean("can_send_messages").default(true),
    can_update_order_status: boolean("can_update_order_status").default(true),
    can_update_payment_status: boolean("can_update_payment_status").default(false),
    can_view_revenue: boolean("can_view_revenue").default(false),
    created_at: text("created_at").default(nowIso),
    tenant_id: text("tenant_id").notNull(),
    updated_at: text("updated_at").default(nowIso),
    user_id: text("user_id").notNull(),
  },
  (t) => ({
    tenantUserUnq: uniqueIndex("team_member_permissions_tenant_user_unq").on(t.tenant_id, t.user_id),
  }),
);

export const teamMemberAccess = pgTable(
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

export const teamInvitations = pgTable(
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

export const teamActivityLogs = pgTable(
  "team_activity_logs",
  {
    id: uid(),
    activity_type: text("activity_type").notNull(),
    created_at: text("created_at").default(nowIso).notNull(),
    entity_id: text("entity_id"),
    entity_type: text("entity_type"),
    metadata: jsonb("metadata"),
    tenant_id: text("tenant_id").notNull(),
    user_id: text("user_id").notNull(),
  },
  (t) => ({
    tenantIdx: index("team_activity_logs_tenant_id_idx").on(t.tenant_id),
  }),
);

export const teamKpiTargets = pgTable(
  "team_kpi_targets",
  {
    id: uid(),
    created_at: text("created_at").default(nowIso).notNull(),
    is_active: boolean("is_active").default(true).notNull(),
    metric: text("metric").notNull(),
    period: text("period").default("daily").notNull(),
    target_value: doublePrecision("target_value").notNull(),
    tenant_id: text("tenant_id").notNull(),
    updated_at: text("updated_at").default(nowIso).notNull(),
    user_id: text("user_id"),
  },
  (t) => ({
    tenantIdx: index("team_kpi_targets_tenant_id_idx").on(t.tenant_id),
  }),
);

export const teamPresenceLogs = pgTable(
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

export const teamWorkSessions = pgTable(
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
    page_activity: jsonb("page_activity"),
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

export const userPresence = pgTable("user_presence", {
  user_id: text("user_id").primaryKey(),
  is_typing_in: text("is_typing_in"),
  last_seen_at: text("last_seen_at").default(nowIso).notNull(),
  status: text("status").default("offline").notNull(),
  tenant_id: text("tenant_id").notNull(),
});

export const permissionTemplates = pgTable(
  "permission_templates",
  {
    id: uid(),
    created_at: text("created_at").default(nowIso),
    description: text("description"),
    is_system: boolean("is_system").default(false),
    name: text("name").notNull(),
    permissions: jsonb("permissions").notNull(),
    tenant_id: text("tenant_id"),
  },
  (t) => ({
    tenantIdx: index("permission_templates_tenant_id_idx").on(t.tenant_id),
  }),
);

// --- Catalog reference (global, read-only via API) -------------------------
export const businessTypes = pgTable("business_types", {
  id: uid(),
  color: text("color"),
  created_at: text("created_at").default(nowIso),
  description: text("description"),
  display_order: integer("display_order").default(0),
  icon: text("icon"),
  is_active: boolean("is_active").default(true),
  name: text("name").notNull(),
  name_bn: text("name_bn"),
  slug: text("slug").notNull(),
  updated_at: text("updated_at").default(nowIso),
});

export const businessTypeFeatures = pgTable(
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
    is_core: boolean("is_core").default(true),
    min_tier: text("min_tier").default("starter"),
  },
  (t) => ({
    typeIdx: index("business_type_features_type_idx").on(t.business_type_id),
  }),
);

export const featureCategories = pgTable("feature_categories", {
  id: uid(),
  created_at: text("created_at").default(nowIso),
  display_order: integer("display_order").default(0),
  icon: text("icon"),
  name: text("name").notNull(),
  name_bn: text("name_bn"),
});

export const systemSettings = pgTable("system_settings", {
  id: uid(),
  created_at: text("created_at").default(nowIso).notNull(),
  description: text("description"),
  key: text("key").notNull(),
  updated_at: text("updated_at").default(nowIso).notNull(),
  value: jsonb("value"),
});

// --- Admin -----------------------------------------------------------------
export const adminAccessRequests = pgTable(
  "admin_access_requests",
  {
    id: uid(),
    created_at: text("created_at").default(nowIso).notNull(),
    permissions: jsonb("permissions"),
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

export const adminTasks = pgTable("admin_tasks", {
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

export const adminNotifications = pgTable("admin_notifications", {
  id: uid(),
  created_at: text("created_at").default(nowIso),
  entity_id: text("entity_id"),
  entity_type: text("entity_type"),
  is_read: boolean("is_read").default(false),
  message: text("message"),
  metadata: jsonb("metadata"),
  tenant_id: text("tenant_id"),
  title: text("title").notNull(),
  type: text("type").notNull(),
});

export const inAppNotifications = pgTable(
  "in_app_notifications",
  {
    id: uid(),
    created_at: text("created_at").default(nowIso),
    entity_id: text("entity_id"),
    entity_type: text("entity_type"),
    is_read: boolean("is_read").default(false),
    message: text("message"),
    metadata: jsonb("metadata"),
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

export const supportTickets = pgTable(
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

export const supportTicketMessages = pgTable(
  "support_ticket_messages",
  {
    id: uid(),
    attachments: jsonb("attachments"),
    created_at: text("created_at").default(nowIso),
    is_internal_note: boolean("is_internal_note").default(false),
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
export const expenseCategories = pgTable("expense_categories", {
  id: uid(),
  color: text("color").default("gray"),
  created_at: text("created_at").default(nowIso),
  description: text("description"),
  icon: text("icon"),
  is_active: boolean("is_active").default(true),
  name: text("name").notNull(),
  updated_at: text("updated_at").default(nowIso),
});

export const expenses = pgTable("expenses", {
  id: uid(),
  amount: doublePrecision("amount").notNull(),
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

export const recurringExpenses = pgTable("recurring_expenses", {
  id: uid(),
  amount: doublePrecision("amount").notNull(),
  category_id: text("category_id"),
  created_at: text("created_at").default(nowIso),
  currency: text("currency").default("BDT"),
  day_of_month: integer("day_of_month").default(1),
  description: text("description").notNull(),
  frequency: text("frequency").default("monthly").notNull(),
  is_active: boolean("is_active").default(true),
  last_generated_at: text("last_generated_at"),
  next_due_date: text("next_due_date").notNull(),
  notes: text("notes"),
  payment_method: text("payment_method"),
  updated_at: text("updated_at").default(nowIso),
  vendor_name: text("vendor_name"),
});

export const tenantExpenseCategories = pgTable(
  "tenant_expense_categories",
  {
    id: uid(),
    color: text("color").default("gray"),
    created_at: text("created_at").default(nowIso),
    description: text("description"),
    icon: text("icon").default("MoreHorizontal"),
    is_active: boolean("is_active").default(true),
    name: text("name").notNull(),
    tenant_id: text("tenant_id").notNull(),
    updated_at: text("updated_at").default(nowIso),
  },
  (t) => ({
    tenantIdx: index("tenant_expense_categories_tenant_id_idx").on(t.tenant_id),
    tenantNameUnq: uniqueIndex("tenant_expense_categories_tenant_name_unq").on(t.tenant_id, t.name),
  }),
);

export const tenantExpenses = pgTable(
  "tenant_expenses",
  {
    id: uid(),
    amount: doublePrecision("amount").notNull(),
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

export const tenantRecurringExpenses = pgTable(
  "tenant_recurring_expenses",
  {
    id: uid(),
    amount: doublePrecision("amount").notNull(),
    category_id: text("category_id"),
    created_at: text("created_at").default(nowIso),
    currency: text("currency").default("BDT"),
    day_of_month: integer("day_of_month"),
    description: text("description").notNull(),
    frequency: text("frequency").notNull(),
    is_active: boolean("is_active").default(true),
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
export const scheduledReportSettings = pgTable(
  "scheduled_report_settings",
  {
    id: uid(),
    created_at: text("created_at").default(nowIso).notNull(),
    daily_enabled: boolean("daily_enabled").default(true).notNull(),
    monthly_enabled: boolean("monthly_enabled").default(true).notNull(),
    send_time: text("send_time").default("20:00:00").notNull(),
    tenant_id: text("tenant_id").notNull(),
    timezone: text("timezone").default("Asia/Dhaka").notNull(),
    updated_at: text("updated_at").default(nowIso).notNull(),
    weekly_enabled: boolean("weekly_enabled").default(true).notNull(),
  },
  (t) => ({
    tenantUnq: uniqueIndex("scheduled_report_settings_tenant_unq").on(t.tenant_id),
  }),
);

export const scheduledReportLogs = pgTable(
  "scheduled_report_logs",
  {
    id: uid(),
    created_at: text("created_at").default(nowIso).notNull(),
    error_message: text("error_message"),
    report_data: jsonb("report_data"),
    report_type: text("report_type").notNull(),
    sent_at: text("sent_at"),
    status: text("status").default("pending").notNull(),
    tenant_id: text("tenant_id").notNull(),
  },
  (t) => ({
    tenantIdx: index("scheduled_report_logs_tenant_id_idx").on(t.tenant_id),
  }),
);

export const reminderSettings = pgTable("reminder_settings", {
  id: uid(),
  channel: text("channel").default("both").notNull(),
  created_at: text("created_at").default(nowIso),
  days_offset: jsonb("days_offset").notNull(),
  email_subject: text("email_subject"),
  is_active: boolean("is_active").default(true),
  reminder_type: text("reminder_type").notNull(),
  template_id: text("template_id"),
  updated_at: text("updated_at").default(nowIso),
});

export const reminderLogs = pgTable(
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

export const onboardingJobs = pgTable(
  "onboarding_jobs",
  {
    id: uid(),
    created_at: text("created_at").default(nowIso).notNull(),
    error_message: text("error_message"),
    instance_id: text("instance_id"),
    metadata: jsonb("metadata"),
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
export const marketingLeads = pgTable("marketing_leads", {
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

export const adminMarketingCampaigns = pgTable("admin_marketing_campaigns", {
  id: uid(),
  alternate_channels: boolean("alternate_channels").default(true),
  blackout_hours: jsonb("blackout_hours"),
  created_at: text("created_at").default(nowIso),
  created_by: text("created_by"),
  frequency_per_month: integer("frequency_per_month").default(4),
  frequency_per_week: integer("frequency_per_week").default(1),
  max_discount_percent: integer("max_discount_percent").default(10),
  min_days_between_messages: integer("min_days_between_messages").default(2),
  name: text("name").notNull(),
  name_bn: text("name_bn"),
  status: text("status").default("draft"),
  target_audience: jsonb("target_audience"),
  target_tier: jsonb("target_tier"),
  type: text("type").notNull(),
  updated_at: text("updated_at").default(nowIso),
  use_email: boolean("use_email").default(true),
  use_whatsapp: boolean("use_whatsapp").default(true),
});

export const adminMarketingSequences = pgTable("admin_marketing_sequences", {
  id: uid(),
  ai_personalize: boolean("ai_personalize").default(false),
  // M4 template-approve-once: a sequence step's template is approved by the
  // founder ONCE through the gate. Once `approved`, after-sales enrollments
  // auto-send this step (transactional) to consented owners — no per-message
  // tap. A new/edited template resets `approved` so it re-gates. `approval_id`
  // links the growth_approvals row that gated it (deduped re-queues).
  approved: boolean("approved").default(false),
  approval_id: text("approval_id"),
  campaign_id: text("campaign_id").notNull(),
  channel: text("channel").notNull(),
  content_template: jsonb("content_template").notNull(),
  created_at: text("created_at").default(nowIso),
  day_of_week: integer("day_of_week"),
  discount_percent: integer("discount_percent").default(0),
  is_active: boolean("is_active").default(true),
  name: text("name").notNull(),
  name_bn: text("name_bn"),
  step_order: integer("step_order").notNull(),
  theme: text("theme"),
  week_number: integer("week_number").notNull(),
});

/**
 * M4 owner channel preferences + consent. One row per tenant (the seller/owner
 * we send after-sales lifecycle touches to). Routing reads this to pick a
 * channel, honor consent/opt-out, enforce quiet hours and a weekly cap, and
 * resolve owner contact (email/sms). Booleans default to allowing the owned,
 * zero-cost channels (in-app/push) and the warm channels (whatsapp/telegram);
 * sms defaults OFF (paid, no provider yet).
 */
export const ownerChannelPrefs = pgTable(
  "owner_channel_prefs",
  {
    id: uid(),
    tenant_id: text("tenant_id").notNull(),
    preferred_channel: text("preferred_channel"),
    in_app_ok: boolean("in_app_ok").default(true).notNull(),
    push_ok: boolean("push_ok").default(true).notNull(),
    whatsapp_ok: boolean("whatsapp_ok").default(true).notNull(),
    telegram_ok: boolean("telegram_ok").default(true).notNull(),
    email: text("email"),
    email_ok: boolean("email_ok").default(true).notNull(),
    sms_number: text("sms_number"),
    sms_ok: boolean("sms_ok").default(false).notNull(),
    // Quiet hours in the owner's local clock (0-23). 22 -> 8 means no pings
    // between 10pm and 8am. Null disables quiet-hours filtering.
    quiet_hours_start: integer("quiet_hours_start").default(22),
    quiet_hours_end: integer("quiet_hours_end").default(8),
    opted_out: boolean("opted_out").default(false).notNull(),
    weekly_cap: integer("weekly_cap").default(5).notNull(),
    messages_this_week: integer("messages_this_week").default(0).notNull(),
    week_reset_at: text("week_reset_at").default(nowIso),
    created_at: text("created_at").default(nowIso).notNull(),
    updated_at: text("updated_at").default(nowIso).notNull(),
  },
  (t) => ({
    tenantUnq: uniqueIndex("owner_channel_prefs_tenant_unq").on(t.tenant_id),
  }),
);

export const adminMarketingEnrollments = pgTable("admin_marketing_enrollments", {
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
  metadata: jsonb("metadata"),
  month_reset_at: text("month_reset_at").default(nowIso),
  next_message_at: text("next_message_at"),
  status: text("status").default("active"),
  total_messages_sent: integer("total_messages_sent").default(0),
  unsubscribed_at: text("unsubscribed_at"),
  week_reset_at: text("week_reset_at").default(nowIso),
});

export const adminMarketingSends = pgTable("admin_marketing_sends", {
  id: uid(),
  ai_generated: boolean("ai_generated").default(false),
  channel: text("channel").notNull(),
  clicked_at: text("clicked_at"),
  content: jsonb("content"),
  created_at: text("created_at").default(nowIso),
  delivered_at: text("delivered_at"),
  enrollment_id: text("enrollment_id").notNull(),
  error_message: text("error_message"),
  opened_at: text("opened_at"),
  sent_at: text("sent_at"),
  sequence_id: text("sequence_id").notNull(),
  status: text("status").default("pending"),
});

export const adminCustomerJourney = pgTable("admin_customer_journey", {
  id: uid(),
  channel: text("channel"),
  created_at: text("created_at").default(nowIso),
  description_bn: text("description_bn"),
  entity_id: text("entity_id").notNull(),
  entity_type: text("entity_type").notNull(),
  event_category: text("event_category"),
  event_type: text("event_type").notNull(),
  metadata: jsonb("metadata"),
  title_bn: text("title_bn").notNull(),
});

// --- Growth approval gate (autonomous growth system) -----------------------
// Every external growth action (publish/spend/contact-human) lands here as a
// row awaiting one-tap founder approval on Telegram before any execution job
// runs. This is the safety chokepoint — see services/growth/approvals.ts.
export const growthApprovals = pgTable(
  "growth_approvals",
  {
    id: uid(),
    artifact_type: text("artifact_type").notNull(), // social_post|outreach_batch|ad|funnel_email|aftersales_touch
    artifact_id: text("artifact_id"),
    summary: text("summary").notNull(),
    payload: jsonb("payload").notNull(),
    status: text("status").default("awaiting_approval").notNull(), // awaiting_approval|approved|executing|executed|failed|rejected|expired
    execute_job_kind: text("execute_job_kind").notNull(),
    tg_chat_id: text("tg_chat_id"),
    tg_message_id: text("tg_message_id"),
    decided_by: text("decided_by"),
    decided_at: text("decided_at"),
    reject_reason: text("reject_reason"),
    execute_job_id: text("execute_job_id"),
    error: text("error"),
    expires_at: text("expires_at"),
    created_at: text("created_at").default(nowIso).notNull(),
    updated_at: text("updated_at").default(nowIso).notNull(),
  },
  (t) => ({
    statusIdx: index("growth_approvals_status_idx").on(t.status),
  }),
);

export const socialPosts = pgTable(
  "social_posts",
  {
    id: uid(),
    campaign_id: text("campaign_id"),
    platform: text("platform").notNull(),
    channel_ids: jsonb("channel_ids").notNull(),
    title: text("title"),
    body: text("body").notNull(),
    media_urls: jsonb("media_urls"),
    status: text("status").default("draft").notNull(), // draft|awaiting_approval|approved|scheduled|published|rejected|failed
    approval_id: text("approval_id"),
    postiz_post_id: text("postiz_post_id"),
    planned_for: text("planned_for"),
    scheduled_at: text("scheduled_at"),
    published_at: text("published_at"),
    ai_generated: boolean("ai_generated").default(true).notNull(),
    created_at: text("created_at").default(nowIso).notNull(),
    updated_at: text("updated_at").default(nowIso).notNull(),
  },
  (t) => ({
    statusIdx: index("social_posts_status_idx").on(t.status),
  }),
);

export const contentPieces = pgTable(
  "content_pieces",
  {
    id: uid(),
    kind: text("kind").default("blog").notNull(),
    slug: text("slug"),
    title: text("title").notNull(),
    body_md: text("body_md"),
    target_keywords: jsonb("target_keywords"),
    seo_score: integer("seo_score"),
    audit_notes: jsonb("audit_notes"),
    status: text("status").default("draft").notNull(), // draft|awaiting_approval|approved|published
    approval_id: text("approval_id"),
    published_at: text("published_at"),
    created_at: text("created_at").default(nowIso).notNull(),
    updated_at: text("updated_at").default(nowIso).notNull(),
  },
  (t) => ({
    statusIdx: index("content_pieces_status_idx").on(t.status),
  }),
);

// --- WooCommerce (deferred-v1; settings page reads integration row) --------
export const woocommerceIntegrations = pgTable(
  "woocommerce_integrations",
  {
    id: uid(),
    consumer_key_encrypted: text("consumer_key_encrypted").notNull(),
    consumer_secret_encrypted: text("consumer_secret_encrypted").notNull(),
    created_at: text("created_at").default(nowIso).notNull(),
    is_active: boolean("is_active").default(true),
    last_sync_at: text("last_sync_at"),
    settings: jsonb("settings"),
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

export const woocommerceSyncLogs = pgTable(
  "woocommerce_sync_logs",
  {
    id: uid(),
    categories_synced: integer("categories_synced").default(0),
    completed_at: text("completed_at"),
    errors: jsonb("errors"),
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
export const internalChatRooms = pgTable(
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

export const internalChatMembers = pgTable(
  "internal_chat_members",
  {
    id: uid(),
    is_admin: boolean("is_admin").default(false).notNull(),
    joined_at: text("joined_at").default(nowIso).notNull(),
    last_read_at: text("last_read_at").default(nowIso),
    room_id: text("room_id").notNull(),
    user_id: text("user_id").notNull(),
  },
  (t) => ({
    roomUserUnq: uniqueIndex("internal_chat_members_room_user_unq").on(t.room_id, t.user_id),
  }),
);

export const internalMessages = pgTable(
  "internal_messages",
  {
    id: uid(),
    content: text("content"),
    content_type: text("content_type").default("text").notNull(),
    created_at: text("created_at").default(nowIso).notNull(),
    edited_at: text("edited_at"),
    is_deleted: boolean("is_deleted").default(false).notNull(),
    media_filename: text("media_filename"),
    media_url: text("media_url"),
    mentions: jsonb("mentions"),
    reply_to_id: text("reply_to_id"),
    room_id: text("room_id").notNull(),
    sender_id: text("sender_id").notNull(),
  },
  (t) => ({
    roomIdx: index("internal_messages_room_id_idx").on(t.room_id),
  }),
);

// --- Service Boards (deferred-v1; read-only) -------------------------------
export const serviceBoards = pgTable(
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

export const serviceBoardMembers = pgTable(
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

export const serviceLists = pgTable(
  "service_lists",
  {
    id: uid(),
    board_id: text("board_id").notNull(),
    created_at: text("created_at").default(nowIso).notNull(),
    is_archived: boolean("is_archived").default(false).notNull(),
    name: text("name").notNull(),
    position_numeric: doublePrecision("position_numeric").default(0).notNull(),
    tenant_id: text("tenant_id").notNull(),
    updated_at: text("updated_at").default(nowIso).notNull(),
  },
  (t) => ({
    tenantIdx: index("service_lists_tenant_id_idx").on(t.tenant_id),
  }),
);

export const serviceCards = pgTable(
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
    position_numeric: doublePrecision("position_numeric").default(0).notNull(),
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

export const serviceLabels = pgTable(
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

export const serviceCardActivity = pgTable(
  "service_card_activity",
  {
    id: uid(),
    card_id: text("card_id").notNull(),
    created_at: text("created_at").default(nowIso).notNull(),
    event_type: text("event_type").notNull(),
    from_value: text("from_value"),
    metadata_json: jsonb("metadata_json"),
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
  growthApprovals,
  socialPosts,
  contentPieces,
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
  ownerChannelPrefs,
};
