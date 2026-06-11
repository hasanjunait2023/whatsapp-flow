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
} from "../db/schema.js";
import type { SQLiteTable } from "drizzle-orm/sqlite-core";

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
}

/**
 * Allowlist of tables exposed through POST /api/query for Phase 1.
 * FORCES tenant scoping on tenant-scoped tables; profiles/tenants are special-cased.
 */
export const QUERY_TABLES: Record<string, TableConfig> = {
  tenants: { table: tenants, tenantColumn: null, access: "own-tenant" },
  profiles: { table: profiles, tenantColumn: null, access: "own-profile" },
  user_roles: { table: userRoles, tenantColumn: null, access: "membership" },
  system_roles: { table: systemRoles, tenantColumn: null, access: "membership" },
  subscriptions: { table: subscriptions, tenantColumn: "tenant_id" },
  whatsapp_instances: { table: whatsappInstances, tenantColumn: "tenant_id" },
  contacts: { table: contacts, tenantColumn: "tenant_id" },
  messages: { table: messages, tenantColumn: "tenant_id" },
  contact_thread_state: { table: contactThreadState, tenantColumn: "tenant_id" },
  contact_labels: { table: contactLabels, tenantColumn: null },
  quick_replies: { table: quickReplies, tenantColumn: "tenant_id" },
  message_templates: { table: messageTemplates, tenantColumn: null },
  tenant_daily_stats: { table: tenantDailyStats, tenantColumn: "tenant_id" },
  notifications: { table: notifications, tenantColumn: "tenant_id" },
};

export function isAllowedTable(name: string): boolean {
  return Object.prototype.hasOwnProperty.call(QUERY_TABLES, name);
}
