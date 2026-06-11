/**
 * Migration table registry: dependency-ordered list of (source table -> target
 * Drizzle table), plus a derivation of each table's column-kind map straight
 * from the Drizzle schema so the transforms stay in lock-step with the schema.
 *
 * Ordering rationale: the SQLite app tables declare NO foreign-key constraints
 * (only the better-auth tables in auth-schema.ts use `.references()`), so
 * `foreign_keys = ON` enforces nothing on the app side. We still insert parents
 * before children for logical correctness and so a future FK pass doesn't break.
 * The auth rows (user -> account) are migrated separately by the orchestrator
 * BEFORE any app table, because tenants.owner_id and *.user_id point at user.id.
 */

import type { SQLiteColumn } from "drizzle-orm/sqlite-core";
import { getTableColumns } from "drizzle-orm";
import { appSchema } from "../src/db/schema.js";
import type { ColumnKind } from "./pg-transforms.js";

/** A table to migrate: the source (Postgres) name and the Drizzle target. */
export interface TableSpec {
  /** Source table name in Postgres (public schema). */
  source: string;
  /** Key into appSchema for the matching Drizzle table. */
  target: keyof typeof appSchema;
}

/**
 * Maps a Drizzle SQLite column to the transform kind its Postgres value needs.
 * - SQLiteTextJson  -> "json"  (jsonb AND text[] both serialise the same way)
 * - SQLiteBoolean   -> "bool"
 * - SQLiteReal      -> "real"  (price/amount/total numerics)
 * - SQLiteInteger   -> "int"
 * - SQLiteText      -> "text"  (uuid/text passthrough; Date -> ISO in toText)
 */
export function columnKind(column: SQLiteColumn): ColumnKind {
  switch (column.columnType) {
    case "SQLiteTextJson":
      return "json";
    case "SQLiteBoolean":
      return "bool";
    case "SQLiteReal":
      return "real";
    case "SQLiteInteger":
      return "int";
    default:
      return "text";
  }
}

/** Builds the { columnName: ColumnKind } map for a target Drizzle table. */
export function kindsForTable(target: keyof typeof appSchema): Record<string, ColumnKind> {
  const table = appSchema[target];
  const columns = getTableColumns(table) as Record<string, SQLiteColumn>;
  const kinds: Record<string, ColumnKind> = {};
  for (const column of Object.values(columns)) {
    // Key by the DB column name (snake_case), which is what pg rows carry.
    kinds[column.name] = columnKind(column);
  }
  return kinds;
}

/** media_url-style columns whose values must be rewritten to local paths. */
export const MEDIA_URL_COLUMNS: ReadonlySet<string> = new Set([
  "media_url",
  "original_media_url",
  "profile_pic_url",
  "logo_url",
  "image_url",
  "pdf_url",
  "attachment_url",
  "profile_picture_url",
  "full_picture",
]);

/**
 * Dependency-ordered migration plan. Parents precede children. Catalog/global
 * tables (plans, business_types, ...) come first since tenants and others
 * reference them by id. Auth (user/account) is handled out-of-band first.
 *
 * NOTE: source names are assumed to equal the SQLite table names (the schema
 * was hand-authored to match Postgres exactly). order_items is included even
 * though tenant_id is synthetic there — see the schema comment; the orchestrator
 * stamps tenant_id from the parent order when the source lacks it.
 */
export const MIGRATION_TABLES: readonly TableSpec[] = [
  // --- Global catalog / reference (no tenant scope) ---
  { source: "business_types", target: "businessTypes" },
  { source: "business_type_features", target: "businessTypeFeatures" },
  { source: "feature_categories", target: "featureCategories" },
  { source: "system_settings", target: "systemSettings" },
  { source: "plans", target: "plans" },
  { source: "coupons", target: "coupons" },
  { source: "message_templates", target: "messageTemplates" },
  { source: "expense_categories", target: "expenseCategories" },
  { source: "recurring_expenses", target: "recurringExpenses" },
  { source: "expenses", target: "expenses" },
  { source: "marketing_leads", target: "marketingLeads" },
  { source: "admin_marketing_campaigns", target: "adminMarketingCampaigns" },
  { source: "admin_marketing_sequences", target: "adminMarketingSequences" },
  { source: "admin_marketing_enrollments", target: "adminMarketingEnrollments" },
  { source: "admin_marketing_sends", target: "adminMarketingSends" },
  { source: "admin_customer_journey", target: "adminCustomerJourney" },
  { source: "reminder_settings", target: "reminderSettings" },

  // --- Identity-adjacent (depend on user.id, migrated after auth) ---
  { source: "profiles", target: "profiles" },
  { source: "system_roles", target: "systemRoles" },
  { source: "admin_access_requests", target: "adminAccessRequests" },
  { source: "admin_tasks", target: "adminTasks" },
  { source: "admin_notifications", target: "adminNotifications" },

  // --- Tenants and tenant membership ---
  { source: "tenants", target: "tenants" },
  { source: "user_roles", target: "userRoles" },
  { source: "subscriptions", target: "subscriptions" },
  { source: "usage_counters", target: "usageCounters" },
  { source: "tenant_daily_stats", target: "tenantDailyStats" },

  // --- Channels / instances (depend on tenant) ---
  { source: "whatsapp_instances", target: "whatsappInstances" },
  { source: "facebook_pages", target: "facebookPages" },

  // --- Contacts / conversations (depend on tenant + instance/page) ---
  { source: "contacts", target: "contacts" },
  { source: "contact_thread_state", target: "contactThreadState" },
  { source: "labels", target: "labels" },
  { source: "contact_labels", target: "contactLabels" },
  { source: "fb_contact_labels", target: "fbContactLabels" },
  { source: "customer_segments", target: "customerSegments" },
  { source: "contact_segments", target: "contactSegments" },
  { source: "customer_scores", target: "customerScores" },
  { source: "customer_scoring_rules", target: "customerScoringRules" },
  { source: "customer_journey_events", target: "customerJourneyEvents" },
  { source: "purchase_behavior_checks", target: "purchaseBehaviorChecks" },
  { source: "fb_contacts", target: "fbContacts" },

  // --- Messages (depend on contacts) ---
  { source: "messages", target: "messages" },
  { source: "message_raw_payloads", target: "messageRawPayloads" },
  { source: "fb_messages", target: "fbMessages" },
  { source: "quick_replies", target: "quickReplies" },

  // --- Catalog: products before variants/orders ---
  { source: "categories", target: "categories" },
  { source: "products", target: "products" },
  { source: "product_variants", target: "productVariants" },
  { source: "stock_movements", target: "stockMovements" },
  { source: "stock_alerts", target: "stockAlerts" },

  // --- Orders (depend on contacts + products) ---
  { source: "orders", target: "orders" },
  { source: "order_items", target: "orderItems" },
  { source: "order_status_history", target: "orderStatusHistory" },
  { source: "invoices", target: "invoices" },
  { source: "invoice_settings", target: "invoiceSettings" },
  { source: "shipments", target: "shipments" },
  { source: "courier_integrations", target: "courierIntegrations" },
  { source: "complaints", target: "complaints" },

  // --- Billing (depend on tenant + plan + coupon) ---
  { source: "payments", target: "payments" },
  { source: "crypto_payment_requests", target: "cryptoPaymentRequests" },
  { source: "coupon_redemptions", target: "couponRedemptions" },
  { source: "subscription_orders", target: "subscriptionOrders" },
  { source: "external_sales_orders", target: "externalSalesOrders" },

  // --- Automation / workflows ---
  { source: "automation_rules", target: "automationRules" },
  { source: "whatsapp_auto_messages", target: "whatsappAutoMessages" },
  { source: "whatsapp_auto_message_log", target: "whatsappAutoMessageLog" },
  { source: "whatsapp_followup_queue", target: "whatsappFollowupQueue" },
  { source: "workflows", target: "workflows" },
  { source: "workflow_nodes", target: "workflowNodes" },
  { source: "workflow_edges", target: "workflowEdges" },
  { source: "workflow_executions", target: "workflowExecutions" },

  // --- Groups (depend on instance) ---
  { source: "whatsapp_groups", target: "whatsappGroups" },
  { source: "whatsapp_group_participants", target: "whatsappGroupParticipants" },
  { source: "group_add_queue", target: "groupAddQueue" },
  { source: "tenant_daily_group_limits", target: "tenantDailyGroupLimits" },

  // --- FB posts / comments (depend on facebook_pages) ---
  { source: "fb_posts", target: "fbPosts" },
  { source: "fb_post_comments", target: "fbPostComments" },

  // --- AI agent ---
  { source: "llm_settings", target: "llmSettings" },
  { source: "llm_usage_events", target: "llmUsageEvents" },
  { source: "agent_souls", target: "agentSouls" },
  { source: "soul_sources", target: "soulSources" },
  { source: "agent_configs", target: "agentConfigs" },
  { source: "agent_runs", target: "agentRuns" },
  { source: "agent_schedules", target: "agentSchedules" },
  { source: "ceo_reports", target: "ceoReports" },

  // --- Team / permissions ---
  { source: "team_member_permissions", target: "teamMemberPermissions" },
  { source: "team_member_access", target: "teamMemberAccess" },
  { source: "team_invitations", target: "teamInvitations" },
  { source: "team_activity_logs", target: "teamActivityLogs" },
  { source: "team_kpi_targets", target: "teamKpiTargets" },
  { source: "team_presence_logs", target: "teamPresenceLogs" },
  { source: "team_work_sessions", target: "teamWorkSessions" },
  { source: "user_presence", target: "userPresence" },
  { source: "permission_templates", target: "permissionTemplates" },

  // --- Tenant expenses / accounting ---
  { source: "tenant_expense_categories", target: "tenantExpenseCategories" },
  { source: "tenant_expenses", target: "tenantExpenses" },
  { source: "tenant_recurring_expenses", target: "tenantRecurringExpenses" },

  // --- Reports / reminders / onboarding ---
  { source: "scheduled_report_settings", target: "scheduledReportSettings" },
  { source: "scheduled_report_logs", target: "scheduledReportLogs" },
  { source: "reminder_logs", target: "reminderLogs" },
  { source: "onboarding_jobs", target: "onboardingJobs" },

  // --- WooCommerce ---
  { source: "woocommerce_integrations", target: "woocommerceIntegrations" },
  { source: "woocommerce_sync_logs", target: "woocommerceSyncLogs" },

  // --- Internal chat ---
  { source: "internal_chat_rooms", target: "internalChatRooms" },
  { source: "internal_chat_members", target: "internalChatMembers" },
  { source: "internal_messages", target: "internalMessages" },

  // --- Service boards ---
  { source: "service_boards", target: "serviceBoards" },
  { source: "service_board_members", target: "serviceBoardMembers" },
  { source: "service_lists", target: "serviceLists" },
  { source: "service_cards", target: "serviceCards" },
  { source: "service_labels", target: "serviceLabels" },
  { source: "service_card_activity", target: "serviceCardActivity" },

  // --- Audit / logs / notifications (last; reference everything) ---
  { source: "notifications", target: "notifications" },
  { source: "in_app_notifications", target: "inAppNotifications" },
  { source: "support_tickets", target: "supportTickets" },
  { source: "support_ticket_messages", target: "supportTicketMessages" },
  { source: "admin_audit_logs", target: "adminAuditLogs" },
  { source: "webhook_events_log", target: "webhookEventsLog" },
  { source: "job_queue", target: "jobQueue" },
  { source: "telegram_links", target: "telegramLinks" },
  { source: "push_subscriptions", target: "pushSubscriptions" },
];
