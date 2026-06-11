import type { Context, MiddlewareHandler } from "hono";
import { eq, and } from "drizzle-orm";
import { db } from "../db/index.js";
import { userRoles, systemRoles, adminAuditLogs } from "../db/schema.js";
import { auth } from "../auth/index.js";

export interface TenantContext {
  userId: string;
  /** Resolved active tenant id (may be impersonated for admins). */
  tenantId: string | null;
  isAdmin: boolean;
  isImpersonating: boolean;
}

declare module "hono" {
  interface ContextVariableMap {
    tenant: TenantContext;
  }
}

const IMPERSONATE_HEADER = "x-impersonate-tenant";
const TENANT_HEADER = "x-tenant-id";

async function resolveIsAdmin(userId: string): Promise<boolean> {
  const rows = await db
    .select({ role: systemRoles.role })
    .from(systemRoles)
    .where(and(eq(systemRoles.user_id, userId), eq(systemRoles.role, "admin")))
    .limit(1);
  return rows.length > 0;
}

async function userBelongsToTenant(userId: string, tenantId: string): Promise<boolean> {
  const rows = await db
    .select({ id: userRoles.id })
    .from(userRoles)
    .where(and(eq(userRoles.user_id, userId), eq(userRoles.tenant_id, tenantId)))
    .limit(1);
  return rows.length > 0;
}

async function firstTenantForUser(userId: string): Promise<string | null> {
  const rows = await db
    .select({ tenant_id: userRoles.tenant_id })
    .from(userRoles)
    .where(eq(userRoles.user_id, userId))
    .limit(1);
  return rows[0]?.tenant_id ?? null;
}

/**
 * Authenticates the request via better-auth session, then resolves the active
 * tenant. Admins may impersonate a tenant via the `x-impersonate-tenant` header
 * (validated to exist and audit-logged). Non-admins are pinned to a tenant they
 * are a member of. Requests without a valid session are rejected with 401.
 */
export const tenantMiddleware: MiddlewareHandler = async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session?.user) {
    return c.json({ data: null, error: { message: "Unauthorized" } }, 401);
  }

  const userId = session.user.id;
  const isAdmin = await resolveIsAdmin(userId);

  const impersonateTarget = c.req.header(IMPERSONATE_HEADER);
  const requestedTenant = c.req.header(TENANT_HEADER);

  let tenantId: string | null = null;
  let isImpersonating = false;

  if (impersonateTarget) {
    if (!isAdmin) {
      return c.json(
        { data: null, error: { message: "Impersonation requires admin" } },
        403,
      );
    }
    const exists = await db
      .select({ id: userRoles.tenant_id })
      .from(userRoles)
      .where(eq(userRoles.tenant_id, impersonateTarget))
      .limit(1);
    if (exists.length === 0) {
      return c.json(
        { data: null, error: { message: "Unknown impersonation target" } },
        404,
      );
    }
    tenantId = impersonateTarget;
    isImpersonating = true;
    await db.insert(adminAuditLogs).values({
      action: "impersonate",
      admin_id: userId,
      entity_type: "tenant",
      entity_id: impersonateTarget,
      details: { path: c.req.path, method: c.req.method },
    });
  } else if (requestedTenant) {
    // A specific tenant was requested; admins may access any, members only their own.
    const allowed = isAdmin || (await userBelongsToTenant(userId, requestedTenant));
    if (!allowed) {
      return c.json(
        { data: null, error: { message: "Forbidden tenant" } },
        403,
      );
    }
    tenantId = requestedTenant;
  } else {
    tenantId = await firstTenantForUser(userId);
  }

  c.set("tenant", { userId, tenantId, isAdmin, isImpersonating });
  await next();
};

export function getTenant(c: Context): TenantContext {
  return c.get("tenant");
}
