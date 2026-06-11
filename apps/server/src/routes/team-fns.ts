import { sqlite } from "../db/index.js";
import { auth } from "../auth/index.js";
import type { FnContext, FnResult } from "./waha/session.js";

/**
 * Team module — create-team-member, reset-team-member-password,
 * accept-invitation. Ported from supabase/functions/* but retargeted at
 * better-auth for credential management.
 *
 * Only tenant owners may manage team members. New members are created with a
 * credential account (password hashed by better-auth), a user_roles row, a
 * profile, and a default team_member_permissions row.
 */

const ok = (data: unknown): FnResult => ({ data, error: null });

function isOwner(userId: string, tenantId: string): boolean {
  const row = sqlite
    .prepare("SELECT role FROM user_roles WHERE user_id = ? AND tenant_id = ? LIMIT 1")
    .get(userId, tenantId) as { role: string } | undefined;
  return row?.role === "owner";
}

interface CreateBody {
  email?: string;
  password?: string;
  fullName?: string;
  role?: string;
  tenantId?: string;
}

/** create-team-member: owner-only; creates the auth user + role + permissions. */
export async function createTeamMember(raw: Record<string, unknown>, ctx: FnContext): Promise<FnResult> {
  const body = raw as CreateBody;
  const tenantId = body.tenantId ?? ctx.tenantId ?? undefined;
  if (!body.email || !body.password || !body.fullName || !body.role || !tenantId) {
    return ok({ error: "Missing required fields: email, password, fullName, role, tenantId" });
  }
  if (!["manager", "agent"].includes(body.role)) {
    return ok({ error: "Invalid role. Must be 'manager' or 'agent'" });
  }
  if (!ctx.isAdmin && !isOwner(ctx.userId, tenantId)) {
    return ok({ error: "Only tenant owners can create team members" });
  }

  // Plan agent-limit enforcement.
  const planRow = sqlite
    .prepare(
      `SELECT p.max_agents AS max_agents
       FROM subscriptions s JOIN plans p ON p.id = s.plan_id
       WHERE s.tenant_id = ? LIMIT 1`,
    )
    .get(tenantId) as { max_agents: number } | undefined;
  const maxAgents = planRow?.max_agents ?? 1;
  const memberCount = (
    sqlite.prepare("SELECT COUNT(*) AS n FROM user_roles WHERE tenant_id = ?").get(tenantId) as { n: number }
  ).n;
  if (memberCount >= maxAgents) {
    return ok({
      error: "Agent limit reached",
      code: "AGENT_LIMIT_REACHED",
      current: memberCount,
      max: maxAgents,
      upgrade_required: true,
    });
  }

  const existing = sqlite
    .prepare("SELECT id FROM user WHERE lower(email) = lower(?) LIMIT 1")
    .get(body.email) as { id: string } | undefined;
  if (existing) return ok({ error: "A user with this email already exists" });

  let newUserId: string;
  try {
    const result = await auth.api.signUpEmail({
      body: { email: body.email, password: body.password, name: body.fullName },
    });
    newUserId = result.user.id;
  } catch (err) {
    return ok({ error: err instanceof Error ? err.message : "Failed to create user" });
  }

  const now = new Date().toISOString();
  const tx = sqlite.transaction(() => {
    sqlite
      .prepare(
        "INSERT OR IGNORE INTO profiles (id, email, full_name, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
      )
      .run(newUserId, body.email, body.fullName, ctx.userId, now, now);
    sqlite
      .prepare(
        "INSERT INTO user_roles (id, user_id, tenant_id, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
      )
      .run(crypto.randomUUID(), newUserId, tenantId, body.role, now, now);
    sqlite
      .prepare(
        "INSERT OR IGNORE INTO team_member_permissions (id, tenant_id, user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
      )
      .run(crypto.randomUUID(), tenantId, newUserId, now, now);
  });
  tx();

  return ok({ success: true, user_id: newUserId });
}

interface ResetBody {
  userId?: string;
  newPassword?: string;
  tenantId?: string;
}

/** reset-team-member-password: owner-only; rehashes the member's credential. */
export async function resetTeamMemberPassword(raw: Record<string, unknown>, ctx: FnContext): Promise<FnResult> {
  const body = raw as ResetBody;
  const tenantId = body.tenantId ?? ctx.tenantId ?? undefined;
  if (!body.userId || !body.newPassword || !tenantId) {
    return ok({ error: "Missing required fields: userId, newPassword, tenantId" });
  }
  if (body.newPassword.length < 6) return ok({ error: "Password must be at least 6 characters" });
  if (!ctx.isAdmin && !isOwner(ctx.userId, tenantId)) {
    return ok({ error: "Only tenant owners can reset passwords" });
  }
  const target = sqlite
    .prepare("SELECT role FROM user_roles WHERE user_id = ? AND tenant_id = ? LIMIT 1")
    .get(body.userId, tenantId) as { role: string } | undefined;
  if (!target) return ok({ error: "Target user is not a member of this tenant" });
  if (target.role === "owner" && !ctx.isAdmin) return ok({ error: "Cannot reset an owner's password" });

  let hash: string;
  try {
    const { hashPassword } = await import("better-auth/crypto");
    hash = await hashPassword(body.newPassword);
  } catch (err) {
    return ok({ error: err instanceof Error ? err.message : "Failed to hash password" });
  }

  const updated = sqlite
    .prepare(
      "UPDATE account SET password = ?, updated_at = ? WHERE user_id = ? AND provider_id = 'credential'",
    )
    .run(hash, Math.floor(Date.now() / 1000), body.userId);
  if (updated.changes === 0) {
    return ok({ error: "No credential account found for this user" });
  }
  return ok({ success: true });
}

interface AcceptBody {
  token?: string;
}

/** accept-invitation: consume a team_invitations token for the active user. */
export async function acceptInvitation(raw: Record<string, unknown>, ctx: FnContext): Promise<FnResult> {
  const body = raw as AcceptBody;
  if (!body.token) return ok({ error: "token is required" });
  const inv = sqlite
    .prepare(
      "SELECT id, tenant_id, email, role, expires_at, accepted_at FROM team_invitations WHERE token = ? LIMIT 1",
    )
    .get(body.token) as
    | { id: string; tenant_id: string; email: string; role: string; expires_at: string; accepted_at: string | null }
    | undefined;
  if (!inv) return ok({ error: "Invalid invitation" });
  if (inv.accepted_at) return ok({ error: "Invitation already accepted" });
  if (new Date(inv.expires_at).getTime() < Date.now()) return ok({ error: "Invitation expired" });

  // SECURITY: bind the token to the invited identity. Without this, any
  // authenticated user holding a token (leaked link/log/referer) could join the
  // tenant with the invited role. The session user's email must match.
  const acceptor = sqlite
    .prepare("SELECT email FROM user WHERE id = ? LIMIT 1")
    .get(ctx.userId) as { email: string | null } | undefined;
  if (!acceptor?.email || acceptor.email.toLowerCase() !== inv.email.toLowerCase()) {
    return ok({ error: "This invitation was sent to a different email address" });
  }

  const now = new Date().toISOString();
  const tx = sqlite.transaction(() => {
    sqlite
      .prepare(
        "INSERT OR IGNORE INTO user_roles (id, user_id, tenant_id, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
      )
      .run(crypto.randomUUID(), ctx.userId, inv.tenant_id, inv.role, now, now);
    sqlite.prepare("UPDATE team_invitations SET accepted_at = ? WHERE id = ?").run(now, inv.id);
  });
  tx();

  return ok({ success: true, tenant_id: inv.tenant_id, role: inv.role });
}

export const TEAM_HANDLERS = {
  "create-team-member": createTeamMember,
  "reset-team-member-password": resetTeamMemberPassword,
  "accept-invitation": acceptInvitation,
};
