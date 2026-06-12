import {
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
  usageCounters,
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
  agentSouls,
  soulSources,
  llmUsageEvents,
  agentConfigs,
  agentRuns,
  cryptoPaymentRequests,
  ceoReports,
  agentSchedules,
  // Phase 3 module tables
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
  serviceBoards,
  serviceBoardMembers,
  serviceLists,
  serviceCards,
  serviceLabels,
  serviceCardActivity,
} from "../db/schema.js";
import type { SQLiteTable } from "drizzle-orm/sqlite-core";

/**
 * Who may mutate (insert/update/upsert/delete) a table through /api/query:
 *  - "tenant":   any authenticated member of the active tenant
 *  - "admin":    only ctx.isAdmin (privilege-bearing / role tables)
 *  - "readonly": never mutable via the generic API (SELECT only)
 */
export type Mutability = "tenant" | "admin" | "readonly";

export interface TableConfig {
  table: SQLiteTable;
  /** Column that scopes rows to a tenant, or null if not tenant-scoped. */
  tenantColumn: string | null;
  /**
   * Special access rules:
   *  - "own-profile": rows readable when id === userId (profiles)
   *  - "own-tenant": rows readable when id is a tenant the user belongs to (tenants)
   *  - "membership": rows scoped by user_id === userId (user_roles, system_roles)
   */
  access?: "own-profile" | "own-tenant" | "membership";
  /**
   * Tenant scoping for junction tables that have NO tenant_id of their own: the
   * row is visible/mutable only when its `fkColumn` points at a row in
   * `parentTable` owned by the caller's tenant. Enforced via a scoped subquery.
   */
  tenantViaParent?: { fkColumn: string; parentTable: string };
  /** Who may mutate this table via /api/query. Defaults to "tenant". */
  mutability?: Mutability;
  /**
   * Columns that confer privilege and must never be set/changed by non-admins
   * (defense in depth for membership tables that are admin-mutable anyway).
   */
  privilegeColumns?: string[];
  /**
   * SECURITY: secret/credential columns that must NEVER leave the server via
   * /api/query. query-exec strips these from every SELECT row and from any
   * insert/update `returning` projection — even when the client asks for "*".
   * Tables holding tokens/keys/secrets must list them here (or be readonly /
   * un-exposed). Server-side flows read these directly through the db layer.
   */
  redactColumns?: string[];
}

/**
 * Allowlist of tables exposed through POST /api/query.
 * FORCES tenant scoping on tenant-scoped tables; profiles/tenants are special-cased.
 *
 * SECURITY: role-bearing tables (user_roles, system_roles) are SELECT-able by the
 * owning user but only mutable by admins. Allowing non-admins to insert/update/
 * upsert/delete them would be a privilege-escalation (IDOR) vector.
 *
 * SECURITY: credential-bearing tables list `redactColumns` so tokens/keys/secrets
 * are stripped from every response. Tables whose ONLY purpose is to hold secrets
 * (e.g. courier_integrations, woocommerce_integrations) are kept fully out of the
 * allowlist; the UI reads a redacted projection via a dedicated route instead.
 */
export const QUERY_TABLES: Record<string, TableConfig> = {
  tenants: { table: tenants, tenantColumn: null, access: "own-tenant", mutability: "tenant" },
  profiles: { table: profiles, tenantColumn: null, access: "own-profile", mutability: "tenant" },
  user_roles: {
    table: userRoles,
    tenantColumn: null,
    access: "membership",
    mutability: "admin",
    privilegeColumns: ["role", "user_id", "tenant_id"],
  },
  system_roles: {
    table: systemRoles,
    tenantColumn: null,
    access: "membership",
    mutability: "admin",
    privilegeColumns: ["role", "is_super_admin", "permissions", "user_id"],
  },
  subscriptions: { table: subscriptions, tenantColumn: "tenant_id", mutability: "tenant" },
  // whatsapp_instances must stay queryable (UI reads status/qr_code/phone_number/
  // name) but api_key_encrypted / webhook_secret are secrets — redact them.
  whatsapp_instances: {
    table: whatsappInstances,
    tenantColumn: "tenant_id",
    mutability: "tenant",
    redactColumns: ["api_key_encrypted", "webhook_secret"],
  },
  contacts: { table: contacts, tenantColumn: "tenant_id", mutability: "tenant" },
  messages: { table: messages, tenantColumn: "tenant_id", mutability: "tenant" },
  contact_thread_state: { table: contactThreadState, tenantColumn: "tenant_id", mutability: "tenant" },
  // contact_labels has no tenant_id; scope it through its parent contact.
  contact_labels: {
    table: contactLabels,
    tenantColumn: null,
    tenantViaParent: { fkColumn: "contact_id", parentTable: "contacts" },
    mutability: "tenant",
  },
  quick_replies: { table: quickReplies, tenantColumn: "tenant_id", mutability: "tenant" },
  message_templates: { table: messageTemplates, tenantColumn: "tenant_id", mutability: "tenant" },
  tenant_daily_stats: { table: tenantDailyStats, tenantColumn: "tenant_id", mutability: "readonly" },
  notifications: { table: notifications, tenantColumn: "tenant_id", mutability: "tenant" },
  // Usage counters are incremented only by the messaging/webhook server paths
  // (via the repo layer), never mutated through the generic /api/query endpoint.
  usage_counters: { table: usageCounters, tenantColumn: "tenant_id", mutability: "readonly" },
  // Global pricing catalog: readable by every authenticated user, admin-managed.
  plans: { table: plans, tenantColumn: null, mutability: "admin" },
  // Payment records are written only by server payment flows (gateway webhooks,
  // admin verification); tenants may read their own history.
  payments: { table: payments, tenantColumn: "tenant_id", mutability: "readonly" },
  categories: { table: categories, tenantColumn: "tenant_id", mutability: "tenant" },
  products: { table: products, tenantColumn: "tenant_id", mutability: "tenant" },
  product_variants: { table: productVariants, tenantColumn: "tenant_id", mutability: "tenant" },
  orders: { table: orders, tenantColumn: "tenant_id", mutability: "tenant" },
  order_items: { table: orderItems, tenantColumn: "tenant_id", mutability: "tenant" },
  // facebook_pages holds page_access_token / app_secret / webhook_verify_token —
  // strip them. The Settings page reads only id/page_id/page_name/status/etc.
  facebook_pages: {
    table: facebookPages,
    tenantColumn: "tenant_id",
    mutability: "tenant",
    redactColumns: ["page_access_token", "app_secret", "webhook_verify_token"],
  },
  fb_contacts: { table: fbContacts, tenantColumn: "tenant_id", mutability: "tenant" },
  fb_messages: { table: fbMessages, tenantColumn: "tenant_id", mutability: "tenant" },
  // Soul lifecycle is driven by the soul-* fn handlers; the UI only reads state.
  agent_souls: { table: agentSouls, tenantColumn: "tenant_id", mutability: "readonly" },
  soul_sources: { table: soulSources, tenantColumn: "tenant_id", mutability: "readonly" },
  // LLM usage events power the Billing usage widget; written by llm/usage.ts only.
  llm_usage_events: { table: llmUsageEvents, tenantColumn: "tenant_id", mutability: "readonly" },
  // Agent behavior config (enable/disable, delays, keywords) is tenant-managed.
  agent_configs: { table: agentConfigs, tenantColumn: "tenant_id", mutability: "tenant" },
  // Run history is observability data; written by the agent orchestrator only.
  agent_runs: { table: agentRuns, tenantColumn: "tenant_id", mutability: "readonly" },
  // Tenants read their own checkout status; writes go through fn handlers and
  // the admin approval route only. (coupons stay un-exposed entirely.)
  crypto_payment_requests: {
    table: cryptoPaymentRequests,
    tenantColumn: "tenant_id",
    mutability: "readonly",
  },
  // CEO reports are generated server-side; the UI reads history.
  ceo_reports: { table: ceoReports, tenantColumn: "tenant_id", mutability: "readonly" },
  // Report cadence is tenant-managed (upsert via the query API).
  agent_schedules: { table: agentSchedules, tenantColumn: "tenant_id", mutability: "tenant" },

  // === Contacts / Segments / Labels =========================================
  labels: { table: labels, tenantColumn: "tenant_id", mutability: "tenant" },
  // fb_contact_labels has no tenant_id; scope through its parent fb_contact.
  fb_contact_labels: {
    table: fbContactLabels,
    tenantColumn: null,
    tenantViaParent: { fkColumn: "contact_id", parentTable: "fb_contacts" },
    mutability: "tenant",
  },
  customer_segments: { table: customerSegments, tenantColumn: "tenant_id", mutability: "tenant" },
  contact_segments: { table: contactSegments, tenantColumn: "tenant_id", mutability: "tenant" },
  customer_scores: { table: customerScores, tenantColumn: "tenant_id", mutability: "readonly" },
  customer_scoring_rules: { table: customerScoringRules, tenantColumn: "tenant_id", mutability: "tenant" },
  customer_journey_events: { table: customerJourneyEvents, tenantColumn: "tenant_id", mutability: "tenant" },
  purchase_behavior_checks: { table: purchaseBehaviorChecks, tenantColumn: "tenant_id", mutability: "tenant" },

  // === Orders / Inventory ===================================================
  // Stock is mutated only via the deduct/restore/adjust RPCs (which log movements).
  stock_movements: { table: stockMovements, tenantColumn: "tenant_id", mutability: "readonly" },
  stock_alerts: { table: stockAlerts, tenantColumn: "tenant_id", mutability: "tenant" },
  order_status_history: { table: orderStatusHistory, tenantColumn: "tenant_id", mutability: "tenant" },

  // === Invoices / Shipments / Courier =======================================
  invoices: { table: invoices, tenantColumn: "tenant_id", mutability: "tenant" },
  invoice_settings: { table: invoiceSettings, tenantColumn: "tenant_id", mutability: "tenant" },
  // Shipments are created/updated only by the courier fns; expose read-only.
  shipments: { table: shipments, tenantColumn: "tenant_id", mutability: "readonly" },
  // courier_integrations holds api_key / api_secret — readable (so Settings can
  // show provider/is_active/store_id/pickup) but the secret columns are REDACTED,
  // and it is read-only here: writes go through courier-save-integration (which
  // encrypts the credentials). See routes/courier-fns.ts.
  courier_integrations: {
    table: courierIntegrations,
    tenantColumn: "tenant_id",
    mutability: "readonly",
    redactColumns: ["api_key", "api_secret"],
  },
  complaints: { table: complaints, tenantColumn: "tenant_id", mutability: "tenant" },

  // === Automation / Workflows / Auto-messages ===============================
  automation_rules: { table: automationRules, tenantColumn: "tenant_id", mutability: "tenant" },
  whatsapp_auto_messages: { table: whatsappAutoMessages, tenantColumn: "tenant_id", mutability: "tenant" },
  whatsapp_auto_message_log: { table: whatsappAutoMessageLog, tenantColumn: "tenant_id", mutability: "readonly" },
  whatsapp_followup_queue: { table: whatsappFollowupQueue, tenantColumn: "tenant_id", mutability: "readonly" },
  workflows: { table: workflows, tenantColumn: "tenant_id", mutability: "tenant" },
  workflow_nodes: { table: workflowNodes, tenantColumn: "tenant_id", mutability: "tenant" },
  workflow_edges: { table: workflowEdges, tenantColumn: "tenant_id", mutability: "tenant" },
  workflow_executions: { table: workflowExecutions, tenantColumn: "tenant_id", mutability: "readonly" },

  // === Groups ================================================================
  whatsapp_groups: { table: whatsappGroups, tenantColumn: "tenant_id", mutability: "tenant" },
  whatsapp_group_participants: { table: whatsappGroupParticipants, tenantColumn: "tenant_id", mutability: "tenant" },
  group_add_queue: { table: groupAddQueue, tenantColumn: "tenant_id", mutability: "tenant" },
  tenant_daily_group_limits: { table: tenantDailyGroupLimits, tenantColumn: "tenant_id", mutability: "readonly" },

  // === FB posts / comments ==================================================
  fb_posts: { table: fbPosts, tenantColumn: "tenant_id", mutability: "tenant" },
  fb_post_comments: { table: fbPostComments, tenantColumn: "tenant_id", mutability: "tenant" },

  // === Billing ===============================================================
  // subscription_orders / external_sales_orders are written by server payment
  // flows + admin routes; tenants read their own.
  subscription_orders: { table: subscriptionOrders, tenantColumn: "tenant_id", mutability: "readonly" },
  external_sales_orders: { table: externalSalesOrders, tenantColumn: "tenant_id", mutability: "readonly" },

  // === Team / Permissions ===================================================
  // Permission rows confer access; only admins/owners may mutate them.
  team_member_permissions: {
    table: teamMemberPermissions,
    tenantColumn: "tenant_id",
    mutability: "admin",
    privilegeColumns: ["user_id"],
  },
  team_member_access: {
    table: teamMemberAccess,
    tenantColumn: "tenant_id",
    mutability: "admin",
    privilegeColumns: ["user_id"],
  },
  // Invitation tokens are secrets — strip the token from query responses.
  team_invitations: {
    table: teamInvitations,
    tenantColumn: "tenant_id",
    mutability: "admin",
    redactColumns: ["token"],
  },
  team_activity_logs: { table: teamActivityLogs, tenantColumn: "tenant_id", mutability: "readonly" },
  team_kpi_targets: { table: teamKpiTargets, tenantColumn: "tenant_id", mutability: "tenant" },
  team_presence_logs: { table: teamPresenceLogs, tenantColumn: "tenant_id", mutability: "tenant" },
  team_work_sessions: { table: teamWorkSessions, tenantColumn: "tenant_id", mutability: "tenant" },
  user_presence: { table: userPresence, tenantColumn: "tenant_id", mutability: "tenant" },
  permission_templates: { table: permissionTemplates, tenantColumn: "tenant_id", mutability: "admin" },

  // === Catalog reference (global, admin-managed, read by everyone) ==========
  business_types: { table: businessTypes, tenantColumn: null, mutability: "admin" },
  business_type_features: { table: businessTypeFeatures, tenantColumn: null, mutability: "admin" },
  feature_categories: { table: featureCategories, tenantColumn: null, mutability: "admin" },
  system_settings: { table: systemSettings, tenantColumn: null, mutability: "admin" },

  // === Admin =================================================================
  admin_access_requests: { table: adminAccessRequests, tenantColumn: null, mutability: "admin" },
  admin_tasks: { table: adminTasks, tenantColumn: null, mutability: "admin" },
  admin_notifications: { table: adminNotifications, tenantColumn: null, mutability: "admin" },
  in_app_notifications: { table: inAppNotifications, tenantColumn: "tenant_id", mutability: "tenant" },
  support_tickets: { table: supportTickets, tenantColumn: "tenant_id", mutability: "tenant" },
  // support_ticket_messages has no tenant_id; scope through its parent ticket.
  support_ticket_messages: {
    table: supportTicketMessages,
    tenantColumn: null,
    tenantViaParent: { fkColumn: "ticket_id", parentTable: "support_tickets" },
    mutability: "tenant",
  },

  // === Accounting (deferred-v1; read-only pages may load these) =============
  expense_categories: { table: expenseCategories, tenantColumn: null, mutability: "admin" },
  expenses: { table: expenses, tenantColumn: null, mutability: "admin" },
  recurring_expenses: { table: recurringExpenses, tenantColumn: null, mutability: "admin" },
  tenant_expense_categories: { table: tenantExpenseCategories, tenantColumn: "tenant_id", mutability: "tenant" },
  tenant_expenses: { table: tenantExpenses, tenantColumn: "tenant_id", mutability: "tenant" },
  tenant_recurring_expenses: { table: tenantRecurringExpenses, tenantColumn: "tenant_id", mutability: "tenant" },

  // === Reports / Reminders / Onboarding =====================================
  scheduled_report_settings: { table: scheduledReportSettings, tenantColumn: "tenant_id", mutability: "tenant" },
  scheduled_report_logs: { table: scheduledReportLogs, tenantColumn: "tenant_id", mutability: "readonly" },
  reminder_settings: { table: reminderSettings, tenantColumn: null, mutability: "admin" },
  reminder_logs: { table: reminderLogs, tenantColumn: "tenant_id", mutability: "readonly" },
  onboarding_jobs: { table: onboardingJobs, tenantColumn: "tenant_id", mutability: "readonly" },

  // === Marketing (deferred-v1; admin pages read these) ======================
  marketing_leads: { table: marketingLeads, tenantColumn: null, mutability: "admin" },
  admin_marketing_campaigns: { table: adminMarketingCampaigns, tenantColumn: null, mutability: "admin" },
  admin_marketing_sequences: { table: adminMarketingSequences, tenantColumn: null, mutability: "admin" },
  admin_marketing_enrollments: { table: adminMarketingEnrollments, tenantColumn: null, mutability: "admin" },
  admin_marketing_sends: { table: adminMarketingSends, tenantColumn: null, mutability: "admin" },
  admin_customer_journey: { table: adminCustomerJourney, tenantColumn: null, mutability: "admin" },

  // === WooCommerce (deferred-v1) ============================================
  // consumer_key_encrypted / consumer_secret_encrypted are secrets — redact them.
  // The integration row is read for store_url/sync_status only.
  woocommerce_integrations: {
    table: woocommerceIntegrations,
    tenantColumn: "tenant_id",
    mutability: "readonly",
    redactColumns: ["consumer_key_encrypted", "consumer_secret_encrypted"],
  },
  woocommerce_sync_logs: { table: woocommerceSyncLogs, tenantColumn: null, mutability: "readonly" },

  // === Internal Chat (deferred-v1) ==========================================
  // Only the tenant-scoped rooms table is exposed. internal_chat_members and
  // internal_messages need MEMBERSHIP-based scoping (rooms the caller belongs
  // to) — tenant-only scoping would still leak staff DMs within a tenant. Plus
  // room creation bulk-inserts members, which can't be safely authorized via
  // raw generic-API inserts. They are intentionally kept OFF the allowlist
  // until a dedicated scoped Internal Chat route is built (see BACKLOG).
  internal_chat_rooms: { table: internalChatRooms, tenantColumn: "tenant_id", mutability: "tenant" },

  // === Service Boards (deferred-v1; read-only) ==============================
  service_boards: { table: serviceBoards, tenantColumn: "tenant_id", mutability: "tenant" },
  service_board_members: { table: serviceBoardMembers, tenantColumn: "tenant_id", mutability: "tenant" },
  service_lists: { table: serviceLists, tenantColumn: "tenant_id", mutability: "tenant" },
  service_cards: { table: serviceCards, tenantColumn: "tenant_id", mutability: "tenant" },
  service_labels: { table: serviceLabels, tenantColumn: "tenant_id", mutability: "tenant" },
  service_card_activity: { table: serviceCardActivity, tenantColumn: "tenant_id", mutability: "readonly" },
};

export function isAllowedTable(name: string): boolean {
  return Object.prototype.hasOwnProperty.call(QUERY_TABLES, name);
}
