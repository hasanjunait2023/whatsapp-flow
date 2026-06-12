import { sqlite } from "../db/index.js";
import { emitChange } from "../realtime/emitter.js";
import type { FnContext, FnResult } from "./waha/session.js";

/**
 * Internal Chat — dedicated, membership-scoped route (NOT generic /api/query).
 *
 * internal_chat_members / internal_messages carry no tenant_id; they are reached
 * ONLY through a room the caller belongs to, and every room is checked against
 * ctx.tenantId. So a user can act only on rooms in their own tenant that they
 * are a member of — closing both the cross-tenant leak AND the intra-tenant DM
 * leak that raw table access would allow. Room creation is atomic here (room +
 * members in one place) instead of the client orchestrating raw inserts.
 */

type FnHandler = (body: Record<string, unknown>, ctx: FnContext) => Promise<FnResult>;

const ok = (data: unknown): FnResult => ({ data, error: null });
const fail = (message: string): FnResult => ({ data: null, error: { message } });

interface ProfileRow {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
}

/** Returns the room row if it exists in the caller's tenant, else null. */
function roomInTenant(roomId: string, tenantId: string): { id: string; tenant_id: string } | null {
  const row = sqlite
    .prepare("SELECT id, tenant_id FROM internal_chat_rooms WHERE id = ? AND tenant_id = ? LIMIT 1")
    .get(roomId, tenantId) as { id: string; tenant_id: string } | undefined;
  return row ?? null;
}

function membership(roomId: string, userId: string): { is_admin: number } | null {
  const row = sqlite
    .prepare("SELECT is_admin FROM internal_chat_members WHERE room_id = ? AND user_id = ? LIMIT 1")
    .get(roomId, userId) as { is_admin: number } | undefined;
  return row ?? null;
}

/** Caller must be a member of a room that lives in their tenant. */
function requireMember(roomId: string, ctx: FnContext): string | null {
  if (!ctx.tenantId) return "No active tenant";
  if (!roomInTenant(roomId, ctx.tenantId)) return "Room not found";
  if (!membership(roomId, ctx.userId)) return "Not a member of this room";
  return null;
}

function profilesFor(ids: string[]): Map<string, ProfileRow> {
  const unique = [...new Set(ids)].filter(Boolean);
  if (unique.length === 0) return new Map();
  const rows = sqlite
    .prepare(
      `SELECT id, email, full_name, avatar_url FROM profiles WHERE id IN (${unique.map(() => "?").join(",")})`,
    )
    .all(...unique) as ProfileRow[];
  return new Map(rows.map((p) => [p.id, p]));
}

export const INTERNAL_CHAT_HANDLERS: Record<string, FnHandler> = {
  // Rooms the caller belongs to, with members, last message and unread count.
  "internal-chat-list-rooms": async (_body, ctx) => {
    if (!ctx.tenantId) return fail("No active tenant");
    const rooms = sqlite
      .prepare(
        `SELECT r.id, r.tenant_id, r.name, r.type, r.created_by, r.created_at, r.updated_at
           FROM internal_chat_rooms r
           JOIN internal_chat_members m ON m.room_id = r.id AND m.user_id = ?
          WHERE r.tenant_id = ?
          ORDER BY r.updated_at DESC`,
      )
      .all(ctx.userId, ctx.tenantId) as Array<Record<string, unknown> & { id: string }>;
    if (rooms.length === 0) return ok([]);

    const roomIds = rooms.map((r) => r.id);
    const placeholders = roomIds.map(() => "?").join(",");
    const members = sqlite
      .prepare(
        `SELECT id, room_id, user_id, last_read_at, joined_at, is_admin
           FROM internal_chat_members WHERE room_id IN (${placeholders})`,
      )
      .all(...roomIds) as Array<{ id: string; room_id: string; user_id: string; last_read_at: string | null; joined_at: string; is_admin: number }>;
    const recent = sqlite
      .prepare(
        `SELECT id, room_id, sender_id, content, content_type, created_at
           FROM internal_messages
          WHERE room_id IN (${placeholders}) AND is_deleted = 0
          ORDER BY created_at DESC`,
      )
      .all(...roomIds) as Array<{ id: string; room_id: string; sender_id: string; content: string | null; content_type: string; created_at: string }>;

    const profiles = profilesFor(members.map((m) => m.user_id));
    const membersByRoom = new Map<string, typeof members>();
    for (const m of members) {
      const list = membersByRoom.get(m.room_id) ?? [];
      list.push(m);
      membersByRoom.set(m.room_id, list);
    }
    const lastByRoom = new Map<string, (typeof recent)[number]>();
    for (const msg of recent) {
      if (!lastByRoom.has(msg.room_id)) lastByRoom.set(msg.room_id, msg);
    }

    const result = rooms.map((room) => {
      const roomMembers = (membersByRoom.get(room.id) ?? []).map((m) => ({
        ...m,
        is_admin: m.is_admin === 1,
        profile: profiles.get(m.user_id) ?? null,
      }));
      const mine = roomMembers.find((m) => m.user_id === ctx.userId);
      const lastReadAt = mine?.last_read_at ? new Date(mine.last_read_at).getTime() : 0;
      const unread = recent.filter(
        (msg) => msg.room_id === room.id && msg.sender_id !== ctx.userId && new Date(msg.created_at).getTime() > lastReadAt,
      ).length;
      return {
        ...room,
        members: roomMembers,
        last_message: lastByRoom.get(room.id) ?? null,
        unread_count: unread,
      };
    });
    return ok(result);
  },

  // Messages in a room (caller must be a member); marks the room read.
  "internal-chat-list-messages": async (body, ctx) => {
    const roomId = typeof body.room_id === "string" ? body.room_id : "";
    const err = requireMember(roomId, ctx);
    if (err) return fail(err);

    const messages = sqlite
      .prepare(
        `SELECT id, room_id, sender_id, content, content_type, media_url, media_filename,
                reply_to_id, mentions, created_at, edited_at, is_deleted
           FROM internal_messages WHERE room_id = ? ORDER BY created_at ASC`,
      )
      .all(roomId) as Array<Record<string, unknown> & { sender_id: string; reply_to_id: string | null }>;

    const profiles = profilesFor(messages.map((m) => m.sender_id));
    const withSenders = messages.map((m) => ({
      ...m,
      is_deleted: m.is_deleted === 1,
      mentions: m.mentions ? JSON.parse(m.mentions as string) : [],
      sender: profiles.get(m.sender_id) ?? null,
    }));

    sqlite
      .prepare("UPDATE internal_chat_members SET last_read_at = ? WHERE room_id = ? AND user_id = ?")
      .run(new Date().toISOString(), roomId, ctx.userId);

    return ok(withSenders);
  },

  // Send a message (caller must be a member). Emits SSE so other tabs refresh.
  "internal-chat-send": async (body, ctx) => {
    const roomId = typeof body.room_id === "string" ? body.room_id : "";
    const err = requireMember(roomId, ctx);
    if (err) return fail(err);

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const mentions = Array.isArray(body.mentions) ? JSON.stringify(body.mentions) : "[]";
    sqlite
      .prepare(
        `INSERT INTO internal_messages
           (id, room_id, sender_id, content, content_type, media_url, media_filename, reply_to_id, mentions, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        roomId,
        ctx.userId,
        typeof body.content === "string" ? body.content : null,
        typeof body.content_type === "string" ? body.content_type : "text",
        typeof body.media_url === "string" ? body.media_url : null,
        typeof body.media_filename === "string" ? body.media_filename : null,
        typeof body.reply_to_id === "string" ? body.reply_to_id : null,
        mentions,
        now,
      );
    sqlite.prepare("UPDATE internal_chat_rooms SET updated_at = ? WHERE id = ?").run(now, roomId);
    emitChange("internal_messages", ctx.tenantId, { room_id: roomId, id });
    return ok({ id, room_id: roomId, sender_id: ctx.userId, created_at: now });
  },

  // Find-or-create a 1:1 room with another user in the same tenant.
  "internal-chat-create-direct": async (body, ctx) => {
    if (!ctx.tenantId) return fail("No active tenant");
    const other = typeof body.other_user_id === "string" ? body.other_user_id : "";
    if (!other || other === ctx.userId) return fail("A valid other_user_id is required");

    const existing = sqlite
      .prepare(
        `SELECT r.id FROM internal_chat_rooms r
           JOIN internal_chat_members me ON me.room_id = r.id AND me.user_id = ?
           JOIN internal_chat_members them ON them.room_id = r.id AND them.user_id = ?
          WHERE r.tenant_id = ? AND r.type = 'direct' LIMIT 1`,
      )
      .get(ctx.userId, other, ctx.tenantId) as { id: string } | undefined;
    if (existing) return ok({ id: existing.id, existed: true });

    const roomId = crypto.randomUUID();
    const now = new Date().toISOString();
    const tx = sqlite.transaction(() => {
      sqlite
        .prepare(
          "INSERT INTO internal_chat_rooms (id, tenant_id, type, created_by, created_at, updated_at) VALUES (?, ?, 'direct', ?, ?, ?)",
        )
        .run(roomId, ctx.tenantId, ctx.userId, now, now);
      const addMember = sqlite.prepare(
        "INSERT INTO internal_chat_members (id, room_id, user_id, is_admin, joined_at, last_read_at) VALUES (?, ?, ?, 1, ?, ?)",
      );
      addMember.run(crypto.randomUUID(), roomId, ctx.userId, now, now);
      addMember.run(crypto.randomUUID(), roomId, other, now, now);
    });
    tx();
    emitChange("internal_chat_rooms", ctx.tenantId, { id: roomId });
    return ok({ id: roomId, existed: false });
  },

  // Create a group room; creator is admin, others are members.
  "internal-chat-create-group": async (body, ctx) => {
    if (!ctx.tenantId) return fail("No active tenant");
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const memberIds = Array.isArray(body.member_ids) ? (body.member_ids as string[]) : [];
    if (!name) return fail("Group name is required");

    const roomId = crypto.randomUUID();
    const now = new Date().toISOString();
    const others = [...new Set(memberIds)].filter((u) => u && u !== ctx.userId);
    const tx = sqlite.transaction(() => {
      sqlite
        .prepare(
          "INSERT INTO internal_chat_rooms (id, tenant_id, name, type, created_by, created_at, updated_at) VALUES (?, ?, ?, 'group', ?, ?, ?)",
        )
        .run(roomId, ctx.tenantId, name, ctx.userId, now, now);
      const addMember = sqlite.prepare(
        "INSERT INTO internal_chat_members (id, room_id, user_id, is_admin, joined_at, last_read_at) VALUES (?, ?, ?, ?, ?, ?)",
      );
      addMember.run(crypto.randomUUID(), roomId, ctx.userId, 1, now, now);
      for (const u of others) addMember.run(crypto.randomUUID(), roomId, u, 0, now, now);
    });
    tx();
    emitChange("internal_chat_rooms", ctx.tenantId, { id: roomId });
    return ok({ id: roomId });
  },

  // Add a member to a group (caller must be a room admin).
  "internal-chat-add-member": async (body, ctx) => {
    const roomId = typeof body.room_id === "string" ? body.room_id : "";
    const userId = typeof body.user_id === "string" ? body.user_id : "";
    if (!userId) return fail("user_id is required");
    const err = requireMember(roomId, ctx);
    if (err) return fail(err);
    if (membership(roomId, ctx.userId)?.is_admin !== 1) return fail("Only a room admin can add members");
    if (membership(roomId, userId)) return ok({ success: true, already: true });
    sqlite
      .prepare(
        "INSERT INTO internal_chat_members (id, room_id, user_id, is_admin, joined_at, last_read_at) VALUES (?, ?, ?, 0, ?, ?)",
      )
      .run(crypto.randomUUID(), roomId, userId, new Date().toISOString(), new Date().toISOString());
    emitChange("internal_chat_rooms", ctx.tenantId, { id: roomId });
    return ok({ success: true });
  },

  // Remove a member (caller must be a room admin, or removing themselves).
  "internal-chat-remove-member": async (body, ctx) => {
    const roomId = typeof body.room_id === "string" ? body.room_id : "";
    const userId = typeof body.user_id === "string" ? body.user_id : "";
    if (!userId) return fail("user_id is required");
    const err = requireMember(roomId, ctx);
    if (err) return fail(err);
    const isAdmin = membership(roomId, ctx.userId)?.is_admin === 1;
    if (!isAdmin && userId !== ctx.userId) return fail("Only a room admin can remove other members");
    sqlite.prepare("DELETE FROM internal_chat_members WHERE room_id = ? AND user_id = ?").run(roomId, userId);
    emitChange("internal_chat_rooms", ctx.tenantId, { id: roomId });
    return ok({ success: true });
  },

  // Mark a room read for the caller.
  "internal-chat-mark-read": async (body, ctx) => {
    const roomId = typeof body.room_id === "string" ? body.room_id : "";
    const err = requireMember(roomId, ctx);
    if (err) return fail(err);
    sqlite
      .prepare("UPDATE internal_chat_members SET last_read_at = ? WHERE room_id = ? AND user_id = ?")
      .run(new Date().toISOString(), roomId, ctx.userId);
    return ok({ success: true });
  },
};
