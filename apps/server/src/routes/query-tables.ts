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
  /** Who may mutate this table via /api/query. Defaults to "tenant". */
  mutability?: Mutability;
  /**
   * Columns that confer privilege and must never be set/changed by non-admins
   * (defense in depth for membership tables that are admin-mutable anyway).
   */
  privilegeColumns?: string[];
}

/**
 * Allowlist of tables exposed through POST /api/query for Phase 1.
 * FORCES tenant scoping on tenant-scoped tables; profiles/tenants are special-cased.
 *
 * SECURITY: role-bearing tables (user_roles, system_roles) are SELECT-able by the
 * owning user but only mutable by admins. Allowing non-admins to insert/update/
 * upsert/delete them would be a privilege-escalation (IDOR) vector.
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
  whatsapp_instances: { table: whatsappInstances, tenantColumn: "tenant_id", mutability: "tenant" },
  contacts: { table: contacts, tenantColumn: "tenant_id", mutability: "tenant" },
  messages: { table: messages, tenantColumn: "tenant_id", mutability: "tenant" },
  contact_thread_state: { table: contactThreadState, tenantColumn: "tenant_id", mutability: "tenant" },
  contact_labels: { table: contactLabels, tenantColumn: null, mutability: "tenant" },
  quick_replies: { table: quickReplies, tenantColumn: "tenant_id", mutability: "tenant" },
  message_templates: { table: messageTemplates, tenantColumn: null, mutability: "tenant" },
  tenant_daily_stats: { table: tenantDailyStats, tenantColumn: "tenant_id", mutability: "tenant" },
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
  facebook_pages: { table: facebookPages, tenantColumn: "tenant_id", mutability: "tenant" },
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
};

export function isAllowedTable(name: string): boolean {
  return Object.prototype.hasOwnProperty.call(QUERY_TABLES, name);
}
